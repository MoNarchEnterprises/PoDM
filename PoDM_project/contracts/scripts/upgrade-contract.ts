import { ethers, upgrades } from 'hardhat';

// Trust-model upgrade ritual for PoDMPaymentProtocol (H-05/M-03, Option C).
//
// UUPS upgrades no longer happen via `upgrades.upgradeProxy` called by a single
// owner key. They must be scheduled through the TimelockController that holds
// UPGRADE_ROLE on the proxy, then executed after the timelock's min delay
// elapses. This script supports three modes selected by the MODE env var:
//
//   MODE=info        (default) Read-only: print proxy, impl, timelock, and the
//                    role attestation. Safe to run any time.
//
//   MODE=schedule    Deploy a new implementation, then call
//                    TimelockController.schedule(proxy, 0, upgradeToAndCall(newImpl,'0x'))
//                    with the configured proposer signer. Prints the operation id
//                    and the time at which it becomes executable. This step does
//                    NOT change the live proxy.
//
//   MODE=execute     Call TimelockController.execute(...) using the operation
//                    id produced by MODE=schedule. Will revert if the delay has
//                    not elapsed. On success the proxy's implementation slot is
//                    updated. Requires UPGRADE_OP_ID env var (id printed by
//                    MODE=schedule) OR UPGRADE_NEW_IMPL env var so the operation
//                    id can be recomputed deterministically.
//
// The deployer private key in DEPLOYER_PRIVATE_KEY acts as proposer+executor
// for the timelock by default. In production these MUST be held by distinct
// multisig-backed keys (see GOVERNANCE.md); no single key should both schedule
// AND execute an upgrade.
//
// ⚠️ STORAGE INCOMPATIBILITY: this script must NOT be used against the legacy
// single-owner proxy at 0x6065836CA141DA7579B4D2F43178c9CBA30bdbcD. It assumes
// a proxy deployed by the new role-separated deploy script.

const ZERO_HASH = '0x0000000000000000000000000000000000000000000000000000000000000000';

async function main() {
  const mode = (process.env.MODE || 'info').toLowerCase() as 'info' | 'schedule' | 'execute';
  if (!['info', 'schedule', 'execute'].includes(mode)) {
    throw new Error(`MODE must be info|schedule|execute (got ${mode})`);
  }

  const proxyAddress = process.env.BASE_CONTRACT_ADDRESS || process.env.BASE_TESTNET_CONTRACT_ADDRESS;
  if (!proxyAddress) throw new Error('Proxy address not found in env (BASE_CONTRACT_ADDRESS / BASE_TESTNET_CONTRACT_ADDRESS)');

  const timelockAddress = process.env.UPGRADE_AUTHORITY_TIMELOCK_ADDRESS;
  if (!timelockAddress) {
    throw new Error('UPGRADE_AUTHORITY_TIMELOCK_ADDRESS env var is required — the TimelockController that holds UPGRADE_ROLE on the proxy.');
  }

  const network = await ethers.provider.getNetwork();
  const [signer] = await ethers.getSigners();
  const PoDMPaymentProtocol = await ethers.getContractFactory('PoDMPaymentProtocol');
  const contract = PoDMPaymentProtocol.attach(proxyAddress) as any;
  const timelock = await ethers.getContractAt('TimelockController', timelockAddress);

  console.log('=== PoDMPaymentProtocol controlled upgrade (H-05/M-03 Option C) ===');
  console.log('Mode:', mode);
  console.log('Network:', network.name, '(chain ID', network.chainId.toString() + ')');
  console.log('Proxy:', proxyAddress);
  console.log('Timelock:', timelockAddress);
  console.log('Signer (proposer/executor):', signer.address);

  // Always: confirm the trust model is in place before doing anything.
  const UPGRADE_ROLE = ethers.id('UPGRADE_ROLE');
  const upgradeBearer = await contract.hasRole(UPGRADE_ROLE, timelockAddress);
  console.log('hasRole(UPGRADE_ROLE, timelock):', upgradeBearer);
  if (!upgradeBearer) {
    throw new Error('Timelock does NOT hold UPGRADE_ROLE on the proxy. Refusing to proceed — the trust model is not in place.');
  }
  const signerIsProposer = await timelock.hasRole(ethers.id('PROPOSER_ROLE'), signer.address);
  const signerIsExecutor = await timelock.hasRole(ethers.id('EXECUTOR_ROLE'), signer.address);
  console.log('signer is PROPOSER:', signerIsProposer, '| EXECUTOR:', signerIsExecutor);

  const currentImpl = await upgrades.erc1967.getImplementationAddress(proxyAddress);
  console.log('Current implementation:', currentImpl);
  const minDelay = await timelock.getMinDelay();
  console.log('Timelock min delay (seconds):', minDelay.toString());

  if (mode === 'info') {
    console.log('\nNo action requested. Use MODE=schedule to begin an upgrade.');
    return;
  }

  if (!(signerIsProposer && signerIsExecutor)) {
    throw new Error('Signer must hold both PROPOSER_ROLE and EXECUTOR_ROLE on the timelock for this script. In production these should be held by DIFFERENT keys.');
  }

  // schedule: deploy a fresh implementation and schedule an upgrade operation.
  if (mode === 'schedule') {
    console.log('\n1. Deploying a fresh implementation...');
    const newImpl = await PoDMPaymentProtocol.deploy();
    await newImpl.waitForDeployment();
    const newImplAddress = await newImpl.getAddress();
    console.log('   New implementation deployed:', newImplAddress);

    const iface = new ethers.Interface(['function upgradeToAndCall(address,bytes)']);
    const data = iface.encodeFunctionData('upgradeToAndCall', [newImplAddress, '0x']);

    console.log('\n2. Scheduling upgrade operation on the timelock...');
    const delay = minDelay > 0n ? minDelay : 1n;
    const tx = await timelock.schedule(proxyAddress, 0, data, ZERO_HASH, ZERO_HASH, delay);
    await tx.wait();

    const opId = await timelock.hashOperation(proxyAddress, 0, data, ZERO_HASH, ZERO_HASH);
    const executableAt = Math.floor(Date.now() / 1000) + Number(delay);
    console.log('   Operation scheduled.');
    console.log('   UPGRADE_OP_ID:', opId);
    console.log('   Earliest executable at (unix):', executableAt);
    console.log('   Earliest executable at (UTC):', new Date(executableAt * 1000).toISOString());
    console.log('');
    console.log('Next: wait for the delay, then re-run with MODE=execute UPGRADE_OP_ID=' + opId);
    return;
  }

  // mode === 'execute'
  const opId = process.env.UPGRADE_OP_ID;
  if (!opId) throw new Error('UPGRADE_OP_ID env var is required for MODE=execute (it was printed by MODE=schedule)');

  // We need to reconstruct calldata for execute(). Require UPGRADE_NEW_IMPL.
  const newImplAddress = process.env.UPGRADE_NEW_IMPL;
  if (!newImplAddress) throw new Error('UPGRADE_NEW_IMPL env var is required for MODE=execute (the same new implementation address used at schedule time).');
  const iface = new ethers.Interface(['function upgradeToAndCall(address,bytes)']);
  const data = iface.encodeFunctionData('upgradeToAndCall', [newImplAddress, '0x']);

  // Sanity: recompute the operation id and verify it matches the env-provided one.
  const recomputedId = await timelock.hashOperation(proxyAddress, 0, data, ZERO_HASH, ZERO_HASH);
  if (recomputedId.toLowerCase() !== opId.toLowerCase()) {
    throw new Error(`UPGRADE_OP_ID mismatch — recomputed ${recomputedId} vs env ${opId}. Confirm UPGRADE_NEW_IMPL matches the value used during schedule.`);
  }

  console.log('\nExecuting upgrade operation through the timelock...');
  const tx = await timelock.execute(proxyAddress, 0, data, ZERO_HASH, ZERO_HASH);
  await tx.wait();

  const updatedImpl = await upgrades.erc1967.getImplementationAddress(proxyAddress);
  console.log('   Old implementation:', currentImpl);
  console.log('   New implementation:', updatedImpl);
  if (updatedImpl.toLowerCase() !== newImplAddress.toLowerCase()) {
    throw new Error('Implementation slot does not match UPGRADE_NEW_IMPL after execute — manual review required.');
  }
  console.log('\n=== Upgrade completed ===');
  console.log('h-05/m-03 CLOSEOUT REMINDER: this transaction is evidence the upgrade path is');
  console.log('enforced via the timelock. An independent attestation against the proxy must still');
  console.log('be recorded (see GOVERNANCE.md) before H-05/M-03 may be marked fixed.');
}

main().catch((error) => {
  console.error('[Upgrade Error]:', error);
  process.exitCode = 1;
});
