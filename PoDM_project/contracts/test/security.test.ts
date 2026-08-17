import { expect } from 'chai';
import { ethers, upgrades } from 'hardhat';
import { time } from '@nomicfoundation/hardhat-toolbox/network-helpers';

const PAUSER_ROLE = ethers.id('PAUSER_ROLE');
const KEEPER_ROLE = ethers.id('KEEPER_ROLE');
const TREASURY_ROLE = ethers.id('TREASURY_ROLE');
const PAYOUT_ROLE = ethers.id('PAYOUT_ROLE');
const UPGRADE_ROLE = ethers.id('UPGRADE_ROLE');
const DEFAULT_ADMIN_ROLE = ethers.ZeroHash;

describe('PoDMPaymentProtocol Security & Invariants', function () {
  async function securityFixture() {
    const [owner, treasury, creator, fan, attacker, pauser, keeper, treasuryAuthority, payoutAuthority] = await ethers.getSigners();
    const PoDMPaymentProtocol = await ethers.getContractFactory('PoDMPaymentProtocol');
    const proxy = await upgrades.deployProxy(
      PoDMPaymentProtocol,
      [
        treasury.address,
        1250,
        owner.address,        // default admin
        ethers.ZeroAddress,  // upgrade authority unset initially
        pauser.address,
        keeper.address,
        treasuryAuthority.address,
        payoutAuthority.address,
      ],
      { kind: 'uups', unsafeAllow: ['constructor'] }
    );
    await proxy.waitForDeployment();
    const contract = PoDMPaymentProtocol.attach(await proxy.getAddress()) as any;

    const MockUSDC = await ethers.getContractFactory('MockUSDC');
    const usdc = await MockUSDC.deploy();
    await usdc.waitForDeployment();

    const FakeToken = await ethers.getContractFactory('MockUSDC');
    const fakeToken = await FakeToken.deploy();
    await fakeToken.waitForDeployment();

    // Set canonical USDC — TREASURY_ROLE holder may configure the token pin
    await contract.connect(treasuryAuthority).setUsdcToken(await usdc.getAddress());

    return { contract, usdc, fakeToken, owner, treasury, creator, fan, attacker, pauser, keeper, treasuryAuthority, payoutAuthority };
  }

  async function timelockSecurityFixture() {
    const base = await securityFixture();
    const TimelockController = await ethers.getContractFactory('TimelockController');
    const delay = 48 * 3600; // 48 hours (production delay)
    const timelock = await TimelockController.deploy(
      delay,
      [base.owner.address],  // proposers
      [base.owner.address],  // executors
      base.owner.address     // admin
    );
    await timelock.waitForDeployment();
    const timelockAddress = await timelock.getAddress();

    // Grant UPGRADE_ROLE exclusively to TimelockController
    await base.contract.connect(base.owner).grantRole(UPGRADE_ROLE, timelockAddress);

    return { ...base, timelock, timelockAddress, delay };
  }

  describe('USDC Token Pinning (C-01 Remediation)', function () {
    it('should reject paySubscription using non-canonical USDC token', async () => {
      const { contract, fakeToken, creator, fan } = await securityFixture();
      const amount = ethers.parseUnits('10', 6);
      await fakeToken.mint(fan.address, amount);
      await fakeToken.connect(fan).approve(await contract.getAddress(), amount);

      await expect(
        contract.connect(fan).paySubscription(
          await fakeToken.getAddress(),
          creator.address,
          amount,
          ethers.ZeroHash,
          ethers.ZeroAddress,
          0
        )
      ).to.be.revertedWith('Only canonical USDC payments supported');
    });

    it('should reject payTip using fake token', async () => {
      const { contract, fakeToken, creator, fan } = await securityFixture();
      const amount = ethers.parseUnits('10', 6);
      await fakeToken.mint(fan.address, amount);
      await fakeToken.connect(fan).approve(await contract.getAddress(), amount);

      await expect(
        contract.connect(fan).payTip(
          await fakeToken.getAddress(),
          creator.address,
          amount,
          ethers.ZeroAddress,
          0
        )
      ).to.be.revertedWith('Only canonical USDC payments supported');
    });

    it('should reject payPPV using fake token', async () => {
      const { contract, fakeToken, creator, fan } = await securityFixture();
      const amount = ethers.parseUnits('10', 6);
      await fakeToken.mint(fan.address, amount);
      await fakeToken.connect(fan).approve(await contract.getAddress(), amount);

      await expect(
        contract.connect(fan).payPPV(
          await fakeToken.getAddress(),
          creator.address,
          amount,
          ethers.ZeroHash,
          ethers.ZeroAddress,
          0
        )
      ).to.be.revertedWith('Only canonical USDC payments supported');
    });

    it('should reject processRenewal using fake token', async () => {
      const { contract, fakeToken, creator, fan, keeper } = await securityFixture();
      const amount = ethers.parseUnits('10', 6);
      const renewalId = ethers.id('renewal-fake-token-test');
      await contract.connect(fan).approveRecurringSubscription(creator.address, amount, 86400);

      await expect(
        contract.connect(keeper).processRenewal(
          renewalId,
          await fakeToken.getAddress(),
          fan.address,
          creator.address,
          amount,
          ethers.ZeroAddress,
          0
        )
      ).to.be.revertedWith('Only canonical USDC payments supported');
    });

    it('should reject processPayout using fake token', async () => {
      const { contract, fakeToken, creator, payoutAuthority } = await securityFixture();
      const amount = ethers.parseUnits('10', 6);

      await expect(
        contract.connect(payoutAuthority).processPayout(
          await fakeToken.getAddress(),
          creator.address,
          amount
        )
      ).to.be.revertedWith('Only canonical USDC payments supported');
    });

    it('should allow payment when using canonical USDC', async () => {
      const { contract, usdc, creator, fan } = await securityFixture();
      const amount = ethers.parseUnits('10', 6);
      await usdc.mint(fan.address, amount);
      await usdc.connect(fan).approve(await contract.getAddress(), amount);

      await expect(
        contract.connect(fan).paySubscription(
          await usdc.getAddress(),
          creator.address,
          amount,
          ethers.ZeroHash,
          ethers.ZeroAddress,
          0
        )
      ).to.emit(contract, 'SubscriptionPaid');
    });

    it('should enforce TREASURY_ROLE for setUsdcToken (rejects non-holder)', async () => {
      const { contract, attacker, fakeToken, treasuryAuthority } = await securityFixture();
      await expect(
        contract.connect(attacker).setUsdcToken(await fakeToken.getAddress())
      ).to.be.reverted;
      // sanity: treasury authority CAN set it
      await expect(
        contract.connect(treasuryAuthority).setUsdcToken(await fakeToken.getAddress())
      ).to.not.be.reverted;
    });

    it('should reject setUsdcToken with zero address', async () => {
      const { contract, treasuryAuthority } = await securityFixture();
      await expect(
        contract.connect(treasuryAuthority).setUsdcToken(ethers.ZeroAddress)
      ).to.be.revertedWith('Invalid USDC address');
    });
  });

  describe('H-05 — Standing Allowance & Upgrade Governance Remediation Suite', function () {
    // ─────────────── Test H05-01 ───────────────
    it('Test H05-01 — EOA cannot upgrade (deployer -> upgradeToAndCall reverts)', async () => {
      const { contract, owner } = await timelockSecurityFixture();
      const PoDMV2 = await ethers.getContractFactory('PoDMPaymentProtocol');
      const newImpl = await PoDMV2.deploy();
      await newImpl.waitForDeployment();
      const newImplAddress = await newImpl.getAddress();

      const proxyAddress = await contract.getAddress();
      const iface = new ethers.Interface(['function upgradeToAndCall(address,bytes)']);
      const data = iface.encodeFunctionData('upgradeToAndCall', [newImplAddress, '0x']);

      // Attempt direct transaction from deployer EOA
      await expect(
        owner.sendTransaction({ to: proxyAddress, data })
      ).to.be.reverted;
    });

    // ─────────────── Test H05-02 ───────────────
    it('Test H05-02 — Owner / DEFAULT_ADMIN_ROLE cannot upgrade directly without UPGRADE_ROLE', async () => {
      const { contract, owner } = await timelockSecurityFixture();
      // Owner holds DEFAULT_ADMIN_ROLE but NOT UPGRADE_ROLE
      expect(await contract.hasRole(DEFAULT_ADMIN_ROLE, owner.address)).to.equal(true);
      expect(await contract.hasRole(UPGRADE_ROLE, owner.address)).to.equal(false);

      const PoDMV2 = await ethers.getContractFactory('PoDMPaymentProtocol', owner);
      await expect(
        upgrades.upgradeProxy(await contract.getAddress(), PoDMV2, { unsafeAllow: ['constructor'] })
      ).to.be.reverted;
    });

    // ─────────────── Test H05-03 ───────────────
    it('Test H05-03 — Random role holders cannot upgrade (PAUSER_ROLE, KEEPER_ROLE, TREASURY_ROLE, PAYOUT_ROLE)', async () => {
      const { contract, pauser, keeper, treasuryAuthority, payoutAuthority, attacker } = await timelockSecurityFixture();
      const signers = [pauser, keeper, treasuryAuthority, payoutAuthority, attacker];

      for (const signer of signers) {
        const PoDMV2 = await ethers.getContractFactory('PoDMPaymentProtocol', signer);
        await expect(
          upgrades.upgradeProxy(await contract.getAddress(), PoDMV2, { unsafeAllow: ['constructor'] })
        ).to.be.reverted;
      }
    });

    // ─────────────── Test H05-04 ───────────────
    it('Test H05-04 — Timelock can schedule upgrade, but immediate execution reverts', async () => {
      const { contract, timelock, owner, delay } = await timelockSecurityFixture();
      const PoDMV2 = await ethers.getContractFactory('PoDMPaymentProtocol');
      const newImpl = await PoDMV2.deploy();
      await newImpl.waitForDeployment();
      const newImplAddress = await newImpl.getAddress();

      const proxyAddress = await contract.getAddress();
      const iface = new ethers.Interface(['function upgradeToAndCall(address,bytes)']);
      const data = iface.encodeFunctionData('upgradeToAndCall', [newImplAddress, '0x']);

      // Schedule upgrade operation
      await timelock.connect(owner).schedule(proxyAddress, 0, data, ethers.ZeroHash, ethers.ZeroHash, delay);

      // Immediate execution must revert (operation is not ready)
      await expect(
        timelock.connect(owner).execute(proxyAddress, 0, data, ethers.ZeroHash, ethers.ZeroHash)
      ).to.be.reverted;
    });

    // ─────────────── Test H05-05 ───────────────
    it('Test H05-05 — Timelock delay enforced (execution before delay expires reverts)', async () => {
      const { contract, timelock, owner, delay } = await timelockSecurityFixture();
      const PoDMV2 = await ethers.getContractFactory('PoDMPaymentProtocol');
      const newImpl = await PoDMV2.deploy();
      await newImpl.waitForDeployment();
      const newImplAddress = await newImpl.getAddress();

      const proxyAddress = await contract.getAddress();
      const iface = new ethers.Interface(['function upgradeToAndCall(address,bytes)']);
      const data = iface.encodeFunctionData('upgradeToAndCall', [newImplAddress, '0x']);

      await timelock.connect(owner).schedule(proxyAddress, 0, data, ethers.ZeroHash, ethers.ZeroHash, delay);

      // Fast forward time to (delay - 100 seconds)
      await time.increase(delay - 100);

      // Still locked, execution must revert
      await expect(
        timelock.connect(owner).execute(proxyAddress, 0, data, ethers.ZeroHash, ethers.ZeroHash)
      ).to.be.reverted;
    });

    // ─────────────── Test H05-06 ───────────────
    it('Test H05-06 — Timelock upgrade succeeds after delay', async () => {
      const { contract, timelock, owner, delay } = await timelockSecurityFixture();
      const PoDMV2 = await ethers.getContractFactory('PoDMPaymentProtocol');
      const newImpl = await PoDMV2.deploy();
      await newImpl.waitForDeployment();
      const newImplAddress = await newImpl.getAddress();

      const proxyAddress = await contract.getAddress();
      const iface = new ethers.Interface(['function upgradeToAndCall(address,bytes)']);
      const data = iface.encodeFunctionData('upgradeToAndCall', [newImplAddress, '0x']);

      await timelock.connect(owner).schedule(proxyAddress, 0, data, ethers.ZeroHash, ethers.ZeroHash, delay);

      // Advance time past full delay
      await time.increase(delay + 1);

      // Execute upgrade
      await expect(
        timelock.connect(owner).execute(proxyAddress, 0, data, ethers.ZeroHash, ethers.ZeroHash)
      ).to.not.be.reverted;

      const currentImpl = await upgrades.erc1967.getImplementationAddress(proxyAddress);
      expect(currentImpl.toLowerCase()).to.equal(newImplAddress.toLowerCase());
    });

    // ─────────────── Test H05-07 ───────────────
    it('Test H05-07 — Malicious implementation cannot bypass authorization and cannot be installed directly by an EOA', async () => {
      const { contract, attacker, owner } = await timelockSecurityFixture();
      const MaliciousV2 = await ethers.getContractFactory('MaliciousV2');
      const maliciousImpl = await MaliciousV2.deploy();
      await maliciousImpl.waitForDeployment();
      const maliciousAddress = await maliciousImpl.getAddress();

      const proxyAddress = await contract.getAddress();
      const iface = new ethers.Interface(['function upgradeToAndCall(address,bytes)']);
      const data = iface.encodeFunctionData('upgradeToAndCall', [maliciousAddress, '0x']);

      // 1. Attacker EOA attempts direct installation
      await expect(
        attacker.sendTransaction({ to: proxyAddress, data })
      ).to.be.reverted;

      // 2. Admin EOA attempts direct installation
      await expect(
        owner.sendTransaction({ to: proxyAddress, data })
      ).to.be.reverted;
    });

    // ─────────────── Test H05-08 ───────────────
    it('Test H05-08 — Timelock cancellation prevents execution', async () => {
      const { contract, timelock, owner, delay } = await timelockSecurityFixture();
      const PoDMV2 = await ethers.getContractFactory('PoDMPaymentProtocol');
      const newImpl = await PoDMV2.deploy();
      await newImpl.waitForDeployment();
      const newImplAddress = await newImpl.getAddress();

      const proxyAddress = await contract.getAddress();
      const iface = new ethers.Interface(['function upgradeToAndCall(address,bytes)']);
      const data = iface.encodeFunctionData('upgradeToAndCall', [newImplAddress, '0x']);

      await timelock.connect(owner).schedule(proxyAddress, 0, data, ethers.ZeroHash, ethers.ZeroHash, delay);

      const opId = await timelock.hashOperation(proxyAddress, 0, data, ethers.ZeroHash, ethers.ZeroHash);

      // Cancel the scheduled upgrade before execution
      await timelock.connect(owner).cancel(opId);

      // Fast forward past delay
      await time.increase(delay + 1);

      // Attempt execution -> must revert
      await expect(
        timelock.connect(owner).execute(proxyAddress, 0, data, ethers.ZeroHash, ethers.ZeroHash)
      ).to.be.reverted;
    });

    // ─────────────── Test H05-09 ───────────────
    it('Test H05-09 — Upgrade event verification (Upgraded event emitted and implementation changes)', async () => {
      const { contract, timelock, owner, delay } = await timelockSecurityFixture();
      const PoDMV2 = await ethers.getContractFactory('PoDMPaymentProtocol');
      const newImpl = await PoDMV2.deploy();
      await newImpl.waitForDeployment();
      const newImplAddress = await newImpl.getAddress();

      const proxyAddress = await contract.getAddress();
      const iface = new ethers.Interface(['function upgradeToAndCall(address,bytes)']);
      const data = iface.encodeFunctionData('upgradeToAndCall', [newImplAddress, '0x']);

      await timelock.connect(owner).schedule(proxyAddress, 0, data, ethers.ZeroHash, ethers.ZeroHash, delay);
      await time.increase(delay + 1);

      const tx = await timelock.connect(owner).execute(proxyAddress, 0, data, ethers.ZeroHash, ethers.ZeroHash);
      const receipt = await tx.wait();

      // Verify Upgraded event was emitted on proxy
      const upgradedTopic = ethers.id('Upgraded(address)');
      const upgradeLog = receipt.logs.find((log: any) => log.topics[0] === upgradedTopic && log.address.toLowerCase() === proxyAddress.toLowerCase());
      expect(upgradeLog).to.not.be.undefined;

      const currentImpl = await upgrades.erc1967.getImplementationAddress(proxyAddress);
      expect(currentImpl.toLowerCase()).to.equal(newImplAddress.toLowerCase());
    });
  });

  describe('H-05 Invariant Verification', function () {
    // ─────────────── Invariant 1 ───────────────
    it('Invariant 1: UPGRADE_ROLE holders ⊆ TimelockController', async () => {
      const { contract, timelockAddress, owner, pauser, keeper, treasuryAuthority, payoutAuthority, attacker, fan, creator } = await timelockSecurityFixture();
      expect(await contract.hasRole(UPGRADE_ROLE, timelockAddress)).to.equal(true);

      const eoas = [owner, pauser, keeper, treasuryAuthority, payoutAuthority, attacker, fan, creator];
      for (const eoa of eoas) {
        expect(await contract.hasRole(UPGRADE_ROLE, eoa.address)).to.equal(false);
      }
    });

    // ─────────────── Invariant 2 ───────────────
    it('Invariant 2: EOA cannot directly change implementation', async () => {
      const { contract, attacker, fan, creator, pauser, keeper } = await timelockSecurityFixture();
      const PoDMV2 = await ethers.getContractFactory('PoDMPaymentProtocol');
      const newImpl = await PoDMV2.deploy();
      await newImpl.waitForDeployment();
      const newImplAddress = await newImpl.getAddress();

      const proxyAddress = await contract.getAddress();
      const iface = new ethers.Interface(['function upgradeToAndCall(address,bytes)']);
      const data = iface.encodeFunctionData('upgradeToAndCall', [newImplAddress, '0x']);

      for (const signer of [attacker, fan, creator, pauser, keeper]) {
        await expect(signer.sendTransaction({ to: proxyAddress, data })).to.be.reverted;
      }
    });

    // ─────────────── Invariant 3 ───────────────
    it('Invariant 3: Implementation cannot change before timelock delay', async () => {
      const { contract, timelock, owner, delay } = await timelockSecurityFixture();
      const initialImpl = await upgrades.erc1967.getImplementationAddress(await contract.getAddress());

      const PoDMV2 = await ethers.getContractFactory('PoDMPaymentProtocol');
      const newImpl = await PoDMV2.deploy();
      await newImpl.waitForDeployment();
      const newImplAddress = await newImpl.getAddress();

      const proxyAddress = await contract.getAddress();
      const iface = new ethers.Interface(['function upgradeToAndCall(address,bytes)']);
      const data = iface.encodeFunctionData('upgradeToAndCall', [newImplAddress, '0x']);

      await timelock.connect(owner).schedule(proxyAddress, 0, data, ethers.ZeroHash, ethers.ZeroHash, delay);

      // Check halfway through delay
      await time.increase(delay / 2);
      await expect(timelock.connect(owner).execute(proxyAddress, 0, data, ethers.ZeroHash, ethers.ZeroHash)).to.be.reverted;

      const currentImpl = await upgrades.erc1967.getImplementationAddress(proxyAddress);
      expect(currentImpl.toLowerCase()).to.equal(initialImpl.toLowerCase());
    });

    // ─────────────── Invariant 4 ───────────────
    it('Invariant 4: Standing allowance cannot be transferred to arbitrary addresses or drained without authorization', async () => {
      const { contract, usdc, fan, creator, attacker, keeper } = await timelockSecurityFixture();
      const allowanceAmount = ethers.parseUnits('50', 6);
      const period = 30 * 24 * 60 * 60; // 30 days

      // Fan deposits / approves allowance
      await usdc.mint(fan.address, allowanceAmount * 2n);
      await usdc.connect(fan).approve(await contract.getAddress(), allowanceAmount * 2n);
      await contract.connect(fan).approveRecurringSubscription(creator.address, allowanceAmount, period);

      const renewalId = ethers.id('standing-allowance-test-1');

      // 1. Attacker (non-keeper) cannot drain allowance
      await expect(
        contract.connect(attacker).processRenewal(
          renewalId,
          await usdc.getAddress(),
          fan.address,
          creator.address,
          allowanceAmount,
          ethers.ZeroAddress,
          0
        )
      ).to.be.revertedWith('Not authorized keeper');

      // 2. Keeper cannot drain to an unapproved creator
      await expect(
        contract.connect(keeper).processRenewal(
          renewalId,
          await usdc.getAddress(),
          fan.address,
          attacker.address, // unapproved creator
          allowanceAmount,
          ethers.ZeroAddress,
          0
        )
      ).to.be.revertedWith('No active allowance');

      // 3. Keeper cannot exceed max amount per period
      await expect(
        contract.connect(keeper).processRenewal(
          renewalId,
          await usdc.getAddress(),
          fan.address,
          creator.address,
          allowanceAmount + 1n,
          ethers.ZeroAddress,
          0
        )
      ).to.be.revertedWith('Amount exceeds allowance');

      // 4. Keeper cannot execute before period elapses
      await expect(
        contract.connect(keeper).processRenewal(
          renewalId,
          await usdc.getAddress(),
          fan.address,
          creator.address,
          allowanceAmount,
          ethers.ZeroAddress,
          0
        )
      ).to.be.revertedWith('Renewal period has not elapsed');
    });

    // ─────────────── Invariant 5 ───────────────
    it('Invariant 5: Upgrade authorization cannot be obtained through PAUSER_ROLE or KEEPER_ROLE', async () => {
      const { contract, pauser, keeper, attacker } = await timelockSecurityFixture();

      // PAUSER_ROLE cannot grant UPGRADE_ROLE
      await expect(
        contract.connect(pauser).grantRole(UPGRADE_ROLE, attacker.address)
      ).to.be.reverted;

      // KEEPER_ROLE cannot grant UPGRADE_ROLE
      await expect(
        contract.connect(keeper).grantRole(UPGRADE_ROLE, attacker.address)
      ).to.be.reverted;
    });

    // ─────────────── Invariant 6 ───────────────
    it('Invariant 6: DEFAULT_ADMIN_ROLE cannot directly bypass upgrade authorization', async () => {
      const { contract, owner } = await timelockSecurityFixture();
      const PoDMV2 = await ethers.getContractFactory('PoDMPaymentProtocol');
      const newImpl = await PoDMV2.deploy();
      await newImpl.waitForDeployment();
      const newImplAddress = await newImpl.getAddress();

      const proxyAddress = await contract.getAddress();
      const iface = new ethers.Interface(['function upgradeToAndCall(address,bytes)']);
      const data = iface.encodeFunctionData('upgradeToAndCall', [newImplAddress, '0x']);

      // Direct upgrade attempt by admin reverts because _authorizeUpgrade checks onlyRole(UPGRADE_ROLE)
      await expect(
        owner.sendTransaction({ to: proxyAddress, data })
      ).to.be.reverted;
    });
  });
});
