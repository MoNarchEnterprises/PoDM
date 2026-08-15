import { ethers, upgrades } from 'hardhat';

// Trust-model deployment ritual for PoDMPaymentProtocol (H-05/M-03, Option C).
//
// This deploy:
//   1. Deploys an immutable TimelockController (NOT upgradeable — see Imports.sol).
//   2. Deploys a new UUPS PoDMPaymentProtocol proxy with the 5-role split, with
//      UPGRADE_ROLE assigned to the timelock, the other operational roles set to
//      distinct env-provided keys, and the deployer holding DEFAULT_ADMIN_ROLE
//      (to be transferred to a Safe multisig in production — see GOVERNANCE.md).
//   3. Provisions the canonical USDC token address as a TREASURY_ROLE-only change.
//
// ⚠️ STORAGE INCOMPATIBILITY: this contract is NOT a storage-compatible upgrade
// of the legacy single-owner proxy at 0x6065836CA141DA7579B4D2F43178c9CBA30bdbcD.
// Because we swapped OwnableUpgradeable for AccessControlUpgradeable, the old
// storage layout does not line up. DO NOT upgrade the live proxy in place.
// Deploy a NEW proxy with this script, migrate state, then repoint
// BASE_CONTRACT_ADDRESS / BASE_TESTNET_CONTRACT_ADDRESS to the new address.
// Anyone who upgrades the old proxy in place will brick it.

async function main() {
  const platformTreasury = process.env.PLATFORM_TREASURY_ADDRESS;
  if (!platformTreasury) throw new Error('PLATFORM_TREASURY_ADDRESS env var is required');

  const defaultAdmin = process.env.GOVERNANCE_DEFAULT_ADMIN;
  if (!defaultAdmin) throw new Error('GOVERNANCE_DEFAULT_ADMIN env var is required (use a Safe multisig address in production)');

  const pauser = requireEnv('GOVERNANCE_PAUSER');
  const keeper = requireEnv('GOVERNANCE_KEEPER');
  const treasuryAuthority = requireEnv('GOVERNANCE_TREASURY_AUTHORITY');
  const payoutAuthority = requireEnv('GOVERNANCE_PAYOUT_AUTHORITY');

  // Optional separate proposer/executor set for the timelock. Defaults: the
  // deployer proposes AND executes on its own (acceptable for the initial
  // bootstrap; in production these must be distinct multisig-backed keys so
  // no single key can both schedule and execute an upgrade).
  const timelockProposers = (process.env.TIMELOCK_PROPOSERS || (await ethers.getSigners())[0].address).split(',').map(s => s.trim());
  const timelockExecutors = (process.env.TIMELOCK_EXECUTORS || (await ethers.getSigners())[0].address).split(',').map(s => s.trim());
  // Minimum delay (seconds) before a scheduled upgrade can be executed. 48h in production, 1h acceptable on testnet.
  const timelockMinDelay = BigInt(parseInt(process.env.TIMELOCK_MIN_DELAY_SECONDS || '3600', 10));

  const platformFeeBps = parseInt(process.env.PLATFORM_FEE_BPS || '1250', 10);
  if (platformFeeBps > 3000) throw new Error('Platform fee BPS cannot exceed 3000 (30%)');

  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  console.log('=== PoDMPaymentProtocol trust-model deployment (H-05/M-03 Option C) ===');
  console.log('Network:', network.name, '(chain ID', network.chainId.toString() + ')');
  console.log('Deployer:', deployer.address, '(holds DEFAULT_ADMIN_ROLE on deploy — transfer to Safe multisig before public launch)');
  console.log('Default admin (GOVERNANCE_DEFAULT_ADMIN):', defaultAdmin);
  console.log('Treasury (PLATFORM_TREASURY_ADDRESS):', platformTreasury);
  console.log('Treasury authority:', treasuryAuthority);
  console.log('Payout authority:', payoutAuthority);
  console.log('Keeper:', keeper);
  console.log('Pauser:', pauser);
  console.log('Timelock min delay (seconds):', timelockMinDelay.toString());
  console.log('Timelock proposers:', timelockProposers.join(', '));
  console.log('Timelock executors:', timelockExecutors.join(', '));

  // 1) Deploy immutable TimelockController. The deployer is the initial admin so
  //    it can grant/renounce PROPOSER/EXECUTOR roles; after bootstrap the
  //    timelock admin role should be resigned so the timelock is self-managed.
  console.log('\n1. Deploying TimelockController (immutable)...');
  const TimelockController = await ethers.getContractFactory('TimelockController');
  const timelock = await TimelockController.deploy(
    timelockMinDelay,
    timelockProposers,
    timelockExecutors,
    deployer.address
  );
  await timelock.waitForDeployment();
  const timelockAddress = await timelock.getAddress();
  console.log('   TimelockController deployed:', timelockAddress);

  // 2) Deploy PoDMPaymentProtocol with UPGRADE_ROLE = timelock address.
  console.log('\n2. Deploying PoDMPaymentProtocol UUPS proxy with role separation...');
  const PoDMPaymentProtocol = await ethers.getContractFactory('PoDMPaymentProtocol');
  const proxy = await upgrades.deployProxy(
    PoDMPaymentProtocol,
    [
      platformTreasury,
      platformFeeBps,
      defaultAdmin,        // DEFAULT_ADMIN_ROLE
      timelockAddress,     // UPGRADE_ROLE (timelock, never an EOA)
      pauser,              // PAUSER_ROLE
      keeper,              // KEEPER_ROLE
      treasuryAuthority,   // TREASURY_ROLE
      payoutAuthority,     // PAYOUT_ROLE
    ],
    { kind: 'uups', unsafeAllow: ['constructor'] }
  );
  await proxy.waitForDeployment();
  const contractAddress = await proxy.getAddress();
  const contract = PoDMPaymentProtocol.attach(contractAddress) as any;
  console.log('   PoDMPaymentProtocol proxy deployed:', contractAddress);

  // 3) Configure canonical USDC. TREASURY_ROLE holder may call this; the
  //    deployer calls it on the treasury authority's behalf only when the
  //    deployer also IS the treasury authority (testnet bootstrap).
  //    In production the treasury authority key holder runs this call themselves.
  const usdcAddress = resolveUsdc(network.chainId);
  if (process.env.DEPLOYER_BOOTSTRAPS_USDC === 'true') {
    const hasTreasuryRole = await contract.hasRole(ethers.id('TREASURY_ROLE'), deployer.address);
    if (!hasTreasuryRole) {
      console.log('   DEPLOYER_BOOTSTRAPS_USDC=true but deployer lacks TREASURY_ROLE; skipping setUsdcToken (treasury authority must call it).');
    } else {
      console.log('\n3. Bootstrap: deployer setting canonical USDC (deployer holds TREASURY_ROLE for bootstrap)...');
      const tx = await contract.setUsdcToken(usdcAddress);
      await tx.wait();
    }
  } else {
    console.log('\n3. Skipping setUsdcToken bootstrap (set DEPLOYER_BOOTSTRAPS_USDC=true AND grant TREASURY_ROLE to deployer to bootstrap).');
    console.log('   Production: treasury authority must call setUsdcToken(' + usdcAddress + ') themselves.');
  }

  // 4) Emit post-deploy attestation: verify the configured role holders
  //    actually hold their assigned roles against the on-chain contract.
  //    This is the only local signal we can produce — for a true closeout of
  //    H-05/M-03 this same assertion must be reproduced against the deployed
  //    proxy address from a block explorer by an independent reviewer.
  const UPGRADE_ROLE = ethers.id('UPGRADE_ROLE');
  const PAUSER_ROLE = ethers.id('PAUSER_ROLE');
  const KEEPER_ROLE = ethers.id('KEEPER_ROLE');
  const TREASURY_ROLE = ethers.id('TREASURY_ROLE');
  const PAYOUT_ROLE = ethers.id('PAYOUT_ROLE');
  const DEFAULT_ADMIN_ROLE = ethers.ZeroHash;

  console.log('\n=== Post-deploy role attestation (on-chain hasRole checks) ===');
  await attestRole(contract, 'DEFAULT_ADMIN_ROLE', DEFAULT_ADMIN_ROLE, defaultAdmin);
  await attestRole(contract, 'UPGRADE_ROLE', UPGRADE_ROLE, timelockAddress);
  await attestRole(contract, 'PAUSER_ROLE', PAUSER_ROLE, pauser);
  await attestRole(contract, 'KEEPER_ROLE', KEEPER_ROLE, keeper);
  await attestRole(contract, 'TREASURY_ROLE', TREASURY_ROLE, treasuryAuthority);
  await attestRole(contract, 'PAYOUT_ROLE', PAYOUT_ROLE, payoutAuthority);

  // Negative attestation: the deployer must NOT hold any operational role —
  // only DEFAULT_ADMIN_ROLE. If the deployer holds an operational role it is a
  // H-05/M-03 violation and must be corrected before public launch.
  // (`deployer` was already bound above.)
  console.log('\n   Negative check: deployer must NOT hold any operational role.');
  for (const [label, roleHash] of [
    ['UPGRADE_ROLE', UPGRADE_ROLE],
    ['PAUSER_ROLE', PAUSER_ROLE],
    ['KEEPER_ROLE', KEEPER_ROLE],
    ['TREASURY_ROLE', TREASURY_ROLE],
    ['PAYOUT_ROLE', PAYOUT_ROLE],
  ] as const) {
    const holds = await contract.hasRole(roleHash, deployer.address);
    console.log(`     deployer.hasRole(${label}) = ${holds}  ${holds ? '  <<< VIOLATION' : ''}`);
  }

  console.log('\nSet these env vars:');
  console.log(`BASE_CONTRACT_ADDRESS=${contractAddress}`);
  console.log(`UPGRADE_AUTHORITY_TIMELOCK_ADDRESS=${timelockAddress}`);
  if (network.chainId === 84532n) {
    console.log(`BASE_TESTNET_CONTRACT_ADDRESS=${contractAddress}`);
  }

  // Explicit reminder per GOVERNANCE.md / H-05 closeout rule: H-05/M-03 is NOT
  // marked "fixed" by deploying the contract — it is only fixed once the same
  // attestation above is reproduced against the proxy address from a block
  // explorer after deployment (executor.permissions.json should record this).
  console.log('');
  console.log('h-05/m-03 CLOSEOUT REMINDER: do NOT mark "Role separation fixed" from this script');
  console.log('output alone. An independent attestation against the deployed proxy is required —');
  console.log('see GOVERNANCE.md.');
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} env var is required (H-05/M-03 role-separated deploy)`);
  return v;
}

function resolveUsdc(chainId: bigint): string {
  if (chainId === 84532n) return '0x036CbD53842c5426634e7929541eC2318f3dCF7e'; // Base Sepolia USDC
  if (chainId === 8453n) return '0x833589fCD6eDb6E08f4c7C32D4f71b54bda02913'; // Base Mainnet USDC
  const override = process.env.USDC_CONTRACT_ADDRESS;
  if (!override) throw new Error('USDC_CONTRACT_ADDRESS env var required for this network');
  return override;
}

async function attestRole(contract: any, label: string, role: string, expectedHolder: string) {
  const ok = await contract.hasRole(role, expectedHolder);
  console.log(`   ${label}: hasRole(${expectedHolder}) = ${ok}${ok ? '' : '  <<< UNEXPECTED'}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
