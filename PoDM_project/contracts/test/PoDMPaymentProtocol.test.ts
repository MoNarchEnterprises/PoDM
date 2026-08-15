import { expect } from 'chai';
import { ethers, upgrades } from 'hardhat';
import { time } from '@nomicfoundation/hardhat-toolbox/network-helpers';

const PAUSER_ROLE = ethers.id('PAUSER_ROLE');
const KEEPER_ROLE = ethers.id('KEEPER_ROLE');
const TREASURY_ROLE = ethers.id('TREASURY_ROLE');
const PAYOUT_ROLE = ethers.id('PAYOUT_ROLE');
const UPGRADE_ROLE = ethers.id('UPGRADE_ROLE');
const DEFAULT_ADMIN_ROLE = '0x0000000000000000000000000000000000000000000000000000000000000000';

describe('PoDMPaymentProtocol', function () {
  async function deployFixture() {
    const [deployer, treasury, creator, fan, pauser, keeper, treasuryAuthority, payoutAuthority, attacker] = await ethers.getSigners();

    const PoDMPaymentProtocol = await ethers.getContractFactory('PoDMPaymentProtocol');
    const proxy = await upgrades.deployProxy(
        PoDMPaymentProtocol,
        [
          treasury.address,
          1250,
          deployer.address,        // default admin (interim)
          ethers.ZeroAddress,      // upgrade authority unset (no timelock yet)
          pauser.address,
          keeper.address,
          treasuryAuthority.address,
          payoutAuthority.address,
        ],
        { kind: 'uups', unsafeAllow: ['constructor'] }
    );
    await proxy.waitForDeployment();
    const contract = PoDMPaymentProtocol.attach(await proxy.getAddress()) as any;
    const contractAddress = await proxy.getAddress();

    const MockUSDC = await ethers.getContractFactory('MockUSDC');
    const usdc = await MockUSDC.deploy();
    await usdc.waitForDeployment();
    await contract.connect(treasuryAuthority).setUsdcToken(await usdc.getAddress());

    return { contract, contractAddress, deployer, treasury, creator, fan, pauser, keeper, treasuryAuthority, payoutAuthority, attacker, usdc };
  }

  describe('Initialization & role separation (H-05/M-03)', function () {
    it('should set treasury and fee correctly', async () => {
      const { contract, treasury } = await deployFixture();
      expect(await contract.platformTreasury()).to.equal(treasury.address);
      expect(await contract.platformFeeBps()).to.equal(1250n);
    });

    it('should assign each operational role to a distinct signer', async () => {
      const { contract, pauser, keeper, treasuryAuthority, payoutAuthority } = await deployFixture();
      expect(await contract.hasRole(PAUSER_ROLE, pauser.address)).to.equal(true);
      expect(await contract.hasRole(KEEPER_ROLE, keeper.address)).to.equal(true);
      expect(await contract.hasRole(TREASURY_ROLE, treasuryAuthority.address)).to.equal(true);
      expect(await contract.hasRole(PAYOUT_ROLE, payoutAuthority.address)).to.equal(true);
    });

    it('should leave UPGRADE_ROLE unset when upgrade authority is address(0)', async () => {
      const { contract, deployer } = await deployFixture();
      expect(await contract.hasRole(UPGRADE_ROLE, deployer.address)).to.equal(false);
      // No address should hold UPGRADE_ROLE — assert across every named signer.
      const { pauser, keeper, treasuryAuthority, payoutAuthority, attacker } = await deployFixture();
      for (const a of [deployer, pauser, keeper, treasuryAuthority, payoutAuthority, attacker]) {
        expect(await contract.hasRole(UPGRADE_ROLE, a.address)).to.equal(false);
      }
    });

    it('should make the deployer the default admin', async () => {
      const { contract, deployer } = await deployFixture();
      expect(await contract.hasRole(DEFAULT_ADMIN_ROLE, deployer.address)).to.equal(true);
      // No other named signer is default admin.
      const { pauser, keeper, treasuryAuthority, payoutAuthority, attacker } = await deployFixture();
      for (const a of [pauser, keeper, treasuryAuthority, payoutAuthority, attacker]) {
        expect(await contract.hasRole(DEFAULT_ADMIN_ROLE, a.address)).to.equal(false);
      }
    });

    it('should start unpaused', async () => {
      const { contract } = await deployFixture();
      expect(await contract.paused()).to.equal(false);
    });

    it('should reject zero-address default admin at initialize', async () => {
      const [treasury, pauser, keeper, treasuryAuthority, payoutAuthority] = await ethers.getSigners();
      const PoDMPaymentProtocol = await ethers.getContractFactory('PoDMPaymentProtocol');
      await expect(
        upgrades.deployProxy(
          PoDMPaymentProtocol,
          [treasury.address, 1250, ethers.ZeroAddress, ethers.ZeroAddress, pauser.address, keeper.address, treasuryAuthority.address, payoutAuthority.address],
          { kind: 'uups', unsafeAllow: ['constructor'] }
        )
      ).to.be.revertedWith('Invalid default admin address');
    });
  });

  describe('Pause is gated by PAUSER_ROLE only', function () {
    it('should allow pauser to pause and unpause', async () => {
      const { contract, pauser } = await deployFixture();
      await contract.connect(pauser).pause();
      expect(await contract.paused()).to.equal(true);
      await contract.connect(pauser).unpause();
      expect(await contract.paused()).to.equal(false);
    });

    it('should reject pause by treasury authority (a different trust boundary)', async () => {
      const { contract, treasuryAuthority } = await deployFixture();
      await expect(contract.connect(treasuryAuthority).pause()).to.be.reverted;
    });

    it('should reject pause by default admin (cannot touch operational roles directly)', async () => {
      const { contract, deployer } = await deployFixture();
      await expect(contract.connect(deployer).pause()).to.be.reverted;
    });
  });

  describe('Fee Management — TREASURY_ROLE only', function () {
    it('should allow treasury authority to update fee', async () => {
      const { contract, treasuryAuthority } = await deployFixture();
      await contract.connect(treasuryAuthority).setPlatformFeeBps(1000);
      expect(await contract.platformFeeBps()).to.equal(1000n);
    });

    it('should reject fee over 30%', async () => {
      const { contract, treasuryAuthority } = await deployFixture();
      await expect(contract.connect(treasuryAuthority).setPlatformFeeBps(3001)).to.be.revertedWith('Fee cannot exceed 30%');
    });

    it('should allow treasury authority to update treasury address', async () => {
      const { contract, fan, treasuryAuthority } = await deployFixture();
      await contract.connect(treasuryAuthority).setPlatformTreasury(fan.address);
      expect(await contract.platformTreasury()).to.equal(fan.address);
    });

    it('should reject fee update by payout authority (separate boundary)', async () => {
      const { contract, payoutAuthority } = await deployFixture();
      await expect(contract.connect(payoutAuthority).setPlatformFeeBps(1000)).to.be.reverted;
    });

    it('should reject fee update by default admin', async () => {
      const { contract, deployer } = await deployFixture();
      await expect(contract.connect(deployer).setPlatformFeeBps(1000)).to.be.reverted;
    });
  });

  describe('Recurring Allowances', function () {
    it('should allow fan to approve recurring subscription', async () => {
      const { contract, creator, fan } = await deployFixture();
      const amount = ethers.parseUnits('10', 6);
      const period = 30 * 24 * 60 * 60;

      await contract.connect(fan).approveRecurringSubscription(creator.address, amount, period);

      const allowance = await contract.getAllowance(fan.address, creator.address);
      expect(allowance.active).to.equal(true);
      expect(allowance.maxAmountPerPeriod).to.equal(amount);
      expect(allowance.periodInSeconds).to.equal(period);
    });

    it('should allow fan to revoke allowance', async () => {
      const { contract, creator, fan } = await deployFixture();
      const amount = ethers.parseUnits('10', 6);
      const period = 30 * 24 * 60 * 60;

      await contract.connect(fan).approveRecurringSubscription(creator.address, amount, period);
      await contract.connect(fan).revokeRecurringSubscription(creator.address);

      const allowance = await contract.getAllowance(fan.address, creator.address);
      expect(allowance.active).to.equal(false);
    });

    it('should reject renewal before period elapses', async () => {
      const { contract, creator, fan, keeper, usdc } = await deployFixture();
      const amount = ethers.parseUnits('10', 6);
      const period = 30 * 24 * 60 * 60;

      await contract.connect(fan).approveRecurringSubscription(creator.address, amount, period);
      await expect(
        contract.connect(keeper).processRenewal(
          await usdc.getAddress(), fan.address, creator.address, amount, ethers.ZeroAddress, 0
        )
      ).to.be.revertedWith('Renewal period has not elapsed');
    });

    it('should reject amount exceeding max allowance', async () => {
      const { contract, creator, fan, keeper, usdc } = await deployFixture();
      const amount = ethers.parseUnits('5', 6);
      const period = 30 * 24 * 60 * 60;

      await contract.connect(fan).approveRecurringSubscription(creator.address, amount, period);
      const excessive = ethers.parseUnits('10', 6);

      await expect(
        contract.connect(keeper).processRenewal(
          await usdc.getAddress(), fan.address, creator.address, excessive, ethers.ZeroAddress, 0
        )
      ).to.be.revertedWith('Amount exceeds allowance');
    });
  });

  describe('Payout — PAYOUT_ROLE only', function () {
    async function payoutFixture() {
      const base = await deployFixture();
      const usdc = base.usdc;

      const treasuryAmount = ethers.parseUnits('10000', 6);
      await usdc.mint(base.treasury.address, treasuryAmount);

      return { ...base, usdc };
    }

    it('should allow payout authority to process payout', async () => {
      const { contract, usdc, creator, treasury, payoutAuthority } = await payoutFixture();
      const amount = ethers.parseUnits('100', 6);

      await usdc.connect(treasury).transfer(await contract.getAddress(), amount);

      await expect(contract.connect(payoutAuthority).processPayout(await usdc.getAddress(), creator.address, amount))
        .to.emit(contract, 'PayoutCompleted')
        .withArgs(creator.address, amount);
    });

    it('should reject payout by treasury authority (cannot push funds it can configure)', async () => {
      const { contract, usdc, creator, treasuryAuthority } = await payoutFixture();
      const amount = ethers.parseUnits('100', 6);
      await expect(
        contract.connect(treasuryAuthority).processPayout(await usdc.getAddress(), creator.address, amount)
      ).to.be.reverted;
    });

    it('should reject payout by default admin', async () => {
      const { contract, usdc, creator, deployer } = await payoutFixture();
      const amount = ethers.parseUnits('100', 6);
      await expect(
        contract.connect(deployer).processPayout(await usdc.getAddress(), creator.address, amount)
      ).to.be.reverted;
    });

    it('should reject payout of zero', async () => {
      const { contract, usdc, creator, payoutAuthority } = await payoutFixture();
      await expect(
        contract.connect(payoutAuthority).processPayout(await usdc.getAddress(), creator.address, 0)
      ).to.be.revertedWith('Amount must be greater than zero');
    });
  });

  describe('Pause blocks payments', function () {
    it('should reject paySubscription when paused', async () => {
      const { contract, creator, fan, usdc, pauser } = await deployFixture();
      await contract.connect(pauser).pause();
      await expect(
        contract.connect(fan).paySubscription(
          await usdc.getAddress(), creator.address, ethers.parseUnits('10', 6), ethers.ZeroHash, ethers.ZeroAddress, 0
        )
      ).to.be.reverted;
    });

    it('should reject approveRecurringSubscription when paused', async () => {
      const { contract, creator, fan, pauser } = await deployFixture();
      await contract.connect(pauser).pause();
      await expect(
        contract.connect(fan).approveRecurringSubscription(creator.address, 100, 86400)
      ).to.be.reverted;
    });
  });

  describe('Referral fee split & custom platform fee BPS', function () {
    async function referralFixture() {
      const base = await deployFixture();
      const referrer = (await ethers.getSigners())[9];
      const usdc = base.usdc;
      const fan = base.fan;
      const creator = base.creator;
      const treasury = base.treasury;
      const treasuryAuthority = base.treasuryAuthority;
      // R-04: bind the referrer to the creator on-chain so the payment tests
      // that pass a non-zero referrer satisfy the new contract enforcement.
      // 200 years from now keeps the binding "active" for the entire test.
      const validUntil = BigInt(Math.floor(Date.now() / 1000) + 200 * 365 * 24 * 60 * 60);
      await contract_connectSetReferrer(base.contract, treasuryAuthority, creator.address, referrer.address, validUntil);
      return { ...base, usdc, fan, creator, referrer, treasury, treasuryAuthority, validUntil };
    }

    // tiny helper kept in closure scope to avoid an ethers-call boilerplate in every test
    async function contract_connectSetReferrer(contract: any, treasuryAuthority: any, creator: string, referrer: string, validUntil: bigint) {
      await contract.connect(treasuryAuthority).setReferrer(creator, referrer, validUntil);
    }

    it('should default referral fee to 1%', async () => {
      const { contract } = await referralFixture();
      expect(await contract.referralFeeBps()).to.equal(100n);
    });

    it('should allow treasury authority to update referral fee', async () => {
      const { contract, treasuryAuthority } = await referralFixture();
      await contract.connect(treasuryAuthority).setReferralFeeBps(200);
      expect(await contract.referralFeeBps()).to.equal(200n);
    });

    it('should reject referral fee above platform fee', async () => {
      const { contract, treasuryAuthority } = await referralFixture();
      await expect(contract.connect(treasuryAuthority).setReferralFeeBps(2000)).to.be.revertedWith('Referral fee cannot exceed platform fee');
    });

    it('should split platform fee between treasury and referrer with default platform fee when 0 is passed', async () => {
      const { contract, usdc, fan, creator, referrer, treasury } = await referralFixture();
      const amount = ethers.parseUnits('10', 6); // $10 USDC
      await usdc.mint(fan.address, amount);
      await usdc.connect(fan).approve(await contract.getAddress(), amount);

      await expect(
        contract.connect(fan).paySubscription(
          await usdc.getAddress(), creator.address, amount, ethers.ZeroHash, referrer.address, 0
        )
      )
        .to.emit(contract, 'SubscriptionPaid')
        .withArgs(fan.address, creator.address, await usdc.getAddress(), amount, ethers.ZeroHash, 1250000n, 100000n, 8750000n, referrer.address);

      // Treasury receives platform fee (12.5%) minus referral fee (1%)
      expect(await usdc.balanceOf(treasury.address)).to.equal(1150000n);
      // Referrer receives 1%
      expect(await usdc.balanceOf(referrer.address)).to.equal(100000n);
      // Creator receives 87.5%
      expect(await usdc.balanceOf(creator.address)).to.equal(8750000n);
    });

    it('should calculate splits with custom platform fee (e.g. 10% for Enclave creator)', async () => {
      const { contract, usdc, fan, creator, referrer, treasury, treasuryAuthority } = await referralFixture();
      await contract.connect(treasuryAuthority).setCreatorFeeBps(creator.address, 1000);
      const amount = ethers.parseUnits('10', 6); // $10 USDC
      await usdc.mint(fan.address, amount);
      await usdc.connect(fan).approve(await contract.getAddress(), amount);

      // Pass 1000 (10% platform fee) and referrer
      await expect(
        contract.connect(fan).paySubscription(
          await usdc.getAddress(), creator.address, amount, ethers.ZeroHash, referrer.address, 1000
        )
      )
        .to.emit(contract, 'SubscriptionPaid')
        .withArgs(fan.address, creator.address, await usdc.getAddress(), amount, ethers.ZeroHash, 1000000n, 100000n, 9000000n, referrer.address);

      // Treasury receives platform fee (10%) minus referral fee (1%) = 9% ($0.90)
      expect(await usdc.balanceOf(treasury.address)).to.equal(900000n);
      // Referrer receives 1% ($0.10)
      expect(await usdc.balanceOf(referrer.address)).to.equal(100000n);
      // Enclave Creator receives 90% ($9.00)
      expect(await usdc.balanceOf(creator.address)).to.equal(9000000n);
    });

    it('should not pay a referrer when referrer is zero with custom fee BPS', async () => {
      const { contract, usdc, fan, creator, treasury, treasuryAuthority } = await referralFixture();
      await contract.connect(treasuryAuthority).setCreatorFeeBps(creator.address, 1000);
      const amount = ethers.parseUnits('10', 6);
      await usdc.mint(fan.address, amount);
      await usdc.connect(fan).approve(await contract.getAddress(), amount);

      await contract.connect(fan).payTip(
        await usdc.getAddress(), creator.address, amount, ethers.ZeroAddress, 1000
      );

      // Full 10% stays with treasury when no referrer
      expect(await usdc.balanceOf(treasury.address)).to.equal(1000000n);
      expect(await usdc.balanceOf(creator.address)).to.equal(9000000n);
    });
  });

  describe('Keeper Management — TREASURY_ROLE only', function () {
    it('should allow treasury authority to set a keeper flag', async () => {
      const { contract, fan, treasuryAuthority } = await deployFixture();
      await contract.connect(treasuryAuthority).setKeeper(fan.address, true);
      expect(await contract.keepers(fan.address)).to.equal(true);
    });

    it('should reject non-treasury setting a keeper flag', async () => {
      const { contract, fan, payoutAuthority } = await deployFixture();
      await expect(contract.connect(payoutAuthority).setKeeper(fan.address, true)).to.be.reverted;
    });

    it('should reject zero address as keeper', async () => {
      const { contract, treasuryAuthority } = await deployFixture();
      await expect(contract.connect(treasuryAuthority).setKeeper(ethers.ZeroAddress, true)).to.be.revertedWith('Invalid keeper address');
    });

    it('should allow treasury authority to revoke a keeper flag', async () => {
      const { contract, fan, treasuryAuthority } = await deployFixture();
      await contract.connect(treasuryAuthority).setKeeper(fan.address, true);
      await contract.connect(treasuryAuthority).setKeeper(fan.address, false);
      expect(await contract.keepers(fan.address)).to.equal(false);
    });
  });

  describe('processRenewal access control', function () {
    it('should reject processRenewal from a non-keeper address', async () => {
        const { contract, creator, fan, usdc, attacker } = await deployFixture();
        const amount = ethers.parseUnits('10', 6);
        const period = 30 * 24 * 60 * 60;
        await contract.connect(fan).approveRecurringSubscription(creator.address, amount, period);

        await time.increase(period + 1);

        await expect(
            contract.connect(attacker).processRenewal(
                await usdc.getAddress(), fan.address, creator.address, amount, ethers.ZeroAddress, 0
            )
        ).to.be.revertedWith('Not authorized keeper');
    });

    it('should allow KEEPER_ROLE holder to call processRenewal', async () => {
        const { contract, creator, fan, usdc, keeper } = await deployFixture();
        const amount = ethers.parseUnits('10', 6);
        const period = 24 * 60 * 60; // 1 day
        await contract.connect(fan).approveRecurringSubscription(creator.address, amount, period);

        // Fund the fan so the renewal can actually move tokens
        await usdc.mint(fan.address, amount);
        await usdc.connect(fan).approve(await contract.getAddress(), amount);

        await time.increase(period + 1);

        await expect(
            contract.connect(keeper).processRenewal(
                await usdc.getAddress(), fan.address, creator.address, amount, ethers.ZeroAddress, 0
            )
        ).to.emit(contract, 'SubscriptionRenewed');
    });

    it('should allow a granted keeper flag (legacy keepers mapping) to call processRenewal', async () => {
        const { contract, creator, fan, usdc, treasuryAuthority } = await deployFixture();
        const extraKeeper = (await ethers.getSigners())[9];
        await contract.connect(treasuryAuthority).setKeeper(extraKeeper.address, true);
        const amount = ethers.parseUnits('10', 6);
        const period = 24 * 60 * 60;
        await contract.connect(fan).approveRecurringSubscription(creator.address, amount, period);

        await usdc.mint(fan.address, amount);
        await usdc.connect(fan).approve(await contract.getAddress(), amount);

        await time.increase(period + 1);

        await expect(
            contract.connect(extraKeeper).processRenewal(
                await usdc.getAddress(), fan.address, creator.address, amount, ethers.ZeroAddress, 0
            )
        ).to.emit(contract, 'SubscriptionRenewed');
    });
  });

  describe('UUPS Upgradeability — UPGRADE_ROLE only', function () {
    it('should reject upgrade by default admin when UPGRADE_ROLE is unset', async () => {
      // In the default fixture UPGRADE_ROLE has no member, so even the deployer
      // (default admin) cannot upgrade. This is the core H-05/M-03 guarantee:
      // the role that manages roles cannot, by itself, swap implementation.
      const { contract, deployer } = await deployFixture();
      const PoDMV2 = await ethers.getContractFactory('PoDMPaymentProtocol', deployer);
      await expect(
        upgrades.upgradeProxy(await contract.getAddress(), PoDMV2, { unsafeAllow: ['constructor'] })
      ).to.be.reverted;
    });

    it('should reject upgrade by treasury authority, payout authority, keeper, and pauser', async () => {
      const { contract, treasuryAuthority, payoutAuthority, keeper, pauser } = await deployFixture();
      for (const signer of [treasuryAuthority, payoutAuthority, keeper, pauser]) {
        const PoDMV2 = await ethers.getContractFactory('PoDMPaymentProtocol', signer);
        await expect(
          upgrades.upgradeProxy(await contract.getAddress(), PoDMV2, { unsafeAllow: ['constructor'] })
        ).to.be.reverted;
      }
    });

    it('should accept upgrade only when caller holds UPGRADE_ROLE', async () => {
      // Grant UPGRADE_ROLE directly to an EOA and confirm that address can upgrade.
      // (In production UPGRADE_ROLE belongs to a TimelockController — see the
      // timelock-gated upgrade test below.)
      const { contract, deployer, attacker } = await deployFixture();
      await contract.connect(deployer).grantRole(UPGRADE_ROLE, attacker.address);

      const PoDMV2 = await ethers.getContractFactory('PoDMPaymentProtocol', attacker);
      const upgraded = await upgrades.upgradeProxy(await contract.getAddress(), PoDMV2, { unsafeAllow: ['constructor'] });
      expect(await upgraded.getAddress()).to.equal(await contract.getAddress());
    });
  });

  describe('UUPS upgrade through TimelockController (H-05/M-03 production path)', function () {
    async function timelockFixture() {
      const base = await deployFixture();
      // Non-upgradeable TimelockController — see contracts/Imports.sol for why
      // the timelock must NOT itself be upgradeable.
      const TimelockController = await ethers.getContractFactory('TimelockController');
      const timelock = await TimelockController.deploy(
        60n * 60n,                // 1 hour minimum delay
        [base.deployer.address],  // proposers
        [base.deployer.address],  // executors
        base.deployer.address     // admin (can be renounced later)
      );
      await timelock.waitForDeployment();

      // Grant UPGRADE_ROLE to the timelock — upgrades now require a scheduled
      // operation executed by the timelock, not a hot key.
      await base.contract.connect(base.deployer).grantRole(UPGRADE_ROLE, await timelock.getAddress());

      return { ...base, timelock };
    }

    it('should reject an upgrade attempted directly by the proposer (timelock bypass)', async () => {
      const { contract, deployer } = await timelockFixture();
      const PoDMV2 = await ethers.getContractFactory('PoDMPaymentProtocol', deployer);
      // deployer is the proposer/executor of the timelock but is NOT the
      // UPGRADE_ROLE holder (the timelock contract is). Direct upgrade must fail.
      await expect(
        upgrades.upgradeProxy(await contract.getAddress(), PoDMV2, { unsafeAllow: ['constructor'] })
      ).to.be.reverted;
    });

    it('should execute the upgrade when scheduled through the timelock after the delay', async () => {
      const { contract, timelock, deployer } = await timelockFixture();

      // Deploy a fresh implementation to upgrade to. The OZ upgrades plugin
      // doesn't know about timelock-gated proxies, so we drive the proxy
      // upgrade manually via the timelock: schedule -> wait -> execute
      // upgradeTo(newImpl).
      const PoDMPaymentProtocol = await ethers.getContractFactory('PoDMPaymentProtocol');
      const newImpl = await PoDMPaymentProtocol.deploy();
      await newImpl.waitForDeployment();
      const newImplAddress = await newImpl.getAddress();

      const proxyAddress = await contract.getAddress();
      // OZ v5 UUPS exposes upgradeToAndCall(address,bytes), NOT upgradeTo(address).
      const iface = new ethers.Interface(['function upgradeToAndCall(address,bytes)']);
      const data = iface.encodeFunctionData('upgradeToAndCall', [newImplAddress, '0x']);

      const delay = 60n * 60n; // 1 hour, matches the timelock minDelay
      await timelock.connect(deployer).schedule(proxyAddress, 0, data, ethers.ZeroHash, ethers.ZeroHash, delay);

      // Before the delay elapses, execution must revert (operation not ready).
      await expect(
        timelock.connect(deployer).execute(proxyAddress, 0, data, ethers.ZeroHash, ethers.ZeroHash)
      ).to.be.reverted;

      await time.increase(delay + 1n);

      // Surface the actual revert reason so a failure here is debuggable.
      let execTx: any;
      try {
        execTx = await timelock.connect(deployer).execute(proxyAddress, 0, data, ethers.ZeroHash, ethers.ZeroHash);
        await execTx.wait();
      } catch (err: any) {
        const reason = err?.shortMessage || err?.reason || err?.message || String(err);
        throw new Error(`Timelock execute reverted: ${reason}`);
      }

      // The implementation slot should now point to newImpl.
      const currentImpl = await upgrades.erc1967.getImplementationAddress(proxyAddress);
      expect(currentImpl.toLowerCase()).to.equal(newImplAddress.toLowerCase());
    });
    it('should accept a direct upgradeToAndCall from an EOA holding UPGRADE_ROLE (sanity for timelock test)', async () => {
      const { contract, deployer } = await deployFixture();
      const upgradeEOA = (await ethers.getSigners())[9];
      await contract.connect(deployer).grantRole(UPGRADE_ROLE, upgradeEOA.address);

      const PoDMPaymentProtocol = await ethers.getContractFactory('PoDMPaymentProtocol');
      const newImpl = await PoDMPaymentProtocol.deploy();
      await newImpl.waitForDeployment();
      const newImplAddress = await newImpl.getAddress();

      const proxyAddress = await contract.getAddress();
      // OZ v5 UUPS exposes upgradeToAndCall(address,bytes), NOT upgradeTo(address).
      const iface = new ethers.Interface(['function upgradeToAndCall(address,bytes)']);
      const data = iface.encodeFunctionData('upgradeToAndCall', [newImplAddress, '0x']);

      const tx = await upgradeEOA.sendTransaction({ to: proxyAddress, data });
      await tx.wait();
      const currentImpl = await upgrades.erc1967.getImplementationAddress(proxyAddress);
      expect(currentImpl.toLowerCase()).to.equal(newImplAddress.toLowerCase());
    });
  });
});
