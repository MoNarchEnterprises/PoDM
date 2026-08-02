import { expect } from 'chai';
import { ethers, upgrades } from 'hardhat';
import { time } from '@nomicfoundation/hardhat-toolbox/network-helpers';

describe('PoDMPaymentProtocol', function () {
  async function deployFixture() {
    const [owner, treasury, creator, fan] = await ethers.getSigners();
    const PoDMPaymentProtocol = await ethers.getContractFactory('PoDMPaymentProtocol');
    const proxy = await upgrades.deployProxy(
        PoDMPaymentProtocol,
        [treasury.address, 1250],
        { kind: 'uups', unsafeAllow: ['constructor'] }
    );
    await proxy.waitForDeployment();
    const contract = PoDMPaymentProtocol.attach(await proxy.getAddress()) as any;
    const contractAddress = await proxy.getAddress();
    return { contract, contractAddress, owner, treasury, creator, fan };
  }

  describe('Initialization', function () {
    it('should set treasury and fee correctly', async () => {
      const { contract, treasury } = await deployFixture();
      expect(await contract.platformTreasury()).to.equal(treasury.address);
      expect(await contract.platformFeeBps()).to.equal(1250n);
    });

    it('should set owner as deployer', async () => {
      const { contract, owner } = await deployFixture();
      expect(await contract.owner()).to.equal(owner.address);
    });

    it('should start unpaused', async () => {
      const { contract } = await deployFixture();
      expect(await contract.paused()).to.equal(false);
    });
  });

  describe('Pause', function () {
    it('should allow owner to pause and unpause', async () => {
      const { contract } = await deployFixture();
      await contract.pause();
      expect(await contract.paused()).to.equal(true);
      await contract.unpause();
      expect(await contract.paused()).to.equal(false);
    });

    it('should reject non-owner pause', async () => {
      const { contract, fan } = await deployFixture();
      await expect(contract.connect(fan).pause()).to.be.reverted;
    });
  });

  describe('Fee Management', function () {
    it('should allow owner to update fee', async () => {
      const { contract } = await deployFixture();
      await contract.setPlatformFeeBps(1000);
      expect(await contract.platformFeeBps()).to.equal(1000n);
    });

    it('should reject fee over 30%', async () => {
      const { contract } = await deployFixture();
      await expect(contract.setPlatformFeeBps(3001)).to.be.revertedWith('Fee cannot exceed 30%');
    });

    it('should allow owner to update treasury', async () => {
      const { contract, fan } = await deployFixture();
      await contract.setPlatformTreasury(fan.address);
      expect(await contract.platformTreasury()).to.equal(fan.address);
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
      const { contract, creator, fan } = await deployFixture();
      const amount = ethers.parseUnits('10', 6);
      const period = 30 * 24 * 60 * 60;

      await contract.connect(fan).approveRecurringSubscription(creator.address, amount, period);
      await expect(
        contract.processRenewal(
          ethers.ZeroAddress, fan.address, creator.address, amount, ethers.ZeroAddress, 0
        )
      ).to.be.revertedWith('Renewal period has not elapsed');
    });

    it('should reject amount exceeding max allowance', async () => {
      const { contract, creator, fan } = await deployFixture();
      const amount = ethers.parseUnits('5', 6);
      const period = 30 * 24 * 60 * 60;

      await contract.connect(fan).approveRecurringSubscription(creator.address, amount, period);
      const excessive = ethers.parseUnits('10', 6);

      await expect(
        contract.processRenewal(
          ethers.ZeroAddress, fan.address, creator.address, excessive, ethers.ZeroAddress, 0
        )
      ).to.be.revertedWith('Amount exceeds allowance');
    });
  });

  describe('Payout', function () {
    async function payoutFixture() {
      const base = await deployFixture();
      const [owner] = await ethers.getSigners();

      const MockUSDC = await ethers.getContractFactory('MockUSDC');
      const usdc = await MockUSDC.deploy();
      await usdc.waitForDeployment();

      // Fund treasury with USDC
      const treasuryAmount = ethers.parseUnits('10000', 6);
      await usdc.mint(base.treasury.address, treasuryAmount);

      return { ...base, usdc };
    }

    it('should allow owner to process payout', async () => {
      const { contract, usdc, creator, treasury } = await payoutFixture();
      const amount = ethers.parseUnits('100', 6);

      // Treasury must approve the contract to spend its USDC (contract transfers from treasury)
      // Actually contract.processPayout uses transfer(), not transferFrom() — so the contract must hold USDC
      await usdc.connect(treasury).transfer(await contract.getAddress(), amount);

      await expect(contract.processPayout(await usdc.getAddress(), creator.address, amount))
        .to.emit(contract, 'PayoutCompleted')
        .withArgs(creator.address, amount);
    });

    it('should reject payout by non-owner', async () => {
      const { contract, usdc, creator, fan } = await payoutFixture();
      const amount = ethers.parseUnits('100', 6);
      await expect(
        contract.connect(fan).processPayout(await usdc.getAddress(), creator.address, amount)
      ).to.be.reverted;
    });

    it('should reject payout of zero', async () => {
      const { contract, usdc, creator } = await payoutFixture();
      await expect(
        contract.processPayout(await usdc.getAddress(), creator.address, 0)
      ).to.be.revertedWith('Amount must be greater than zero');
    });
  });

  describe('Pause blocks payments', function () {
    it('should reject paySubscription when paused', async () => {
      const { contract, creator, fan } = await deployFixture();
      await contract.pause();
      await expect(
        contract.connect(fan).paySubscription(
          ethers.ZeroAddress, creator.address, ethers.parseUnits('10', 6), ethers.ZeroHash, ethers.ZeroAddress, 0
        )
      ).to.be.reverted;
    });

    it('should reject approveRecurringSubscription when paused', async () => {
      const { contract, creator, fan } = await deployFixture();
      await contract.pause();
      await expect(
        contract.connect(fan).approveRecurringSubscription(creator.address, 100, 86400)
      ).to.be.reverted;
    });
  });

  describe('Referral fee split & custom platform fee BPS', function () {
    async function referralFixture() {
      const base = await deployFixture();
      const [owner] = await ethers.getSigners();
      const referrer = (await ethers.getSigners())[4];

      const MockUSDC = await ethers.getContractFactory('MockUSDC');
      const usdc = await MockUSDC.deploy();
      await usdc.waitForDeployment();

      const fan = (await ethers.getSigners())[3];
      const creator = (await ethers.getSigners())[2];

      return { ...base, usdc, fan, creator, referrer, owner };
    }

    it('should default referral fee to 1%', async () => {
      const { contract } = await referralFixture();
      expect(await contract.referralFeeBps()).to.equal(100n);
    });

    it('should allow owner to update referral fee', async () => {
      const { contract } = await referralFixture();
      await contract.setReferralFeeBps(200);
      expect(await contract.referralFeeBps()).to.equal(200n);
    });

    it('should reject referral fee above platform fee', async () => {
      const { contract } = await referralFixture();
      await expect(contract.setReferralFeeBps(2000)).to.be.revertedWith('Referral fee cannot exceed platform fee');
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
      const { contract, usdc, fan, creator, referrer, treasury } = await referralFixture();
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
      const { contract, usdc, fan, creator, treasury } = await referralFixture();
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
  describe('Keeper Management', function () {
    it('should allow owner to set a keeper', async () => {
        const { contract, fan } = await deployFixture();
        await contract.setKeeper(fan.address, true);
        expect(await contract.keepers(fan.address)).to.equal(true);
    });

    it('should reject non-owner setting a keeper', async () => {
        const { contract, fan, creator } = await deployFixture();
        await expect(contract.connect(fan).setKeeper(creator.address, true)).to.be.reverted;
    });

    it('should reject zero address as keeper', async () => {
        const { contract } = await deployFixture();
        await expect(contract.setKeeper(ethers.ZeroAddress, true)).to.be.revertedWith('Invalid keeper address');
    });

    it('should allow owner to revoke a keeper', async () => {
        const { contract, fan } = await deployFixture();
        await contract.setKeeper(fan.address, true);
        await contract.setKeeper(fan.address, false);
        expect(await contract.keepers(fan.address)).to.equal(false);
    });
  });

  describe('processRenewal access control', function () {
    it('should reject processRenewal from non-keeper', async () => {
        const { contract, creator, fan } = await deployFixture();
        const amount = ethers.parseUnits('10', 6);
        const period = 30 * 24 * 60 * 60;
        await contract.connect(fan).approveRecurringSubscription(creator.address, amount, period);
        
        // Try calling processRenewal from a random address (not keeper, not owner)
        const [,,, , randomUser] = await ethers.getSigners();
        await expect(
            contract.connect(randomUser).processRenewal(
                ethers.ZeroAddress, fan.address, creator.address, amount, ethers.ZeroAddress, 0
            )
        ).to.be.revertedWith('Not authorized keeper');
    });

    it('should allow owner to call processRenewal', async () => {
        const { contract, creator, fan } = await deployFixture();
        const amount = ethers.parseUnits('10', 6);
        const period = 24 * 60 * 60; // 1 day
        await contract.connect(fan).approveRecurringSubscription(creator.address, amount, period);
        
        await time.increase(period + 1);

        // Owner should pass the keeper check (will fail on ERC20 transfer but NOT on access control)
        await expect(
            contract.processRenewal(
                ethers.ZeroAddress, fan.address, creator.address, amount, ethers.ZeroAddress, 0
            )
        ).to.not.be.revertedWith('Not authorized keeper');
    });

    it('should allow registered keeper to call processRenewal', async () => {
        const { contract, creator, fan } = await deployFixture();
        const [,,,,keeperUser] = await ethers.getSigners();
        await contract.setKeeper(keeperUser.address, true);
        const amount = ethers.parseUnits('10', 6);
        const period = 24 * 60 * 60;
        await contract.connect(fan).approveRecurringSubscription(creator.address, amount, period);
        
        await time.increase(period + 1);

        // Keeper should pass the keeper check
        await expect(
            contract.connect(keeperUser).processRenewal(
                ethers.ZeroAddress, fan.address, creator.address, amount, ethers.ZeroAddress, 0
            )
        ).to.not.be.revertedWith('Not authorized keeper');
    });
  });

  describe('UUPS Upgradeability', function () {
    it('should be upgradeable by owner', async () => {
        const { contract } = await deployFixture();
        const PoDMV2 = await ethers.getContractFactory('PoDMPaymentProtocol');
        // This just verifies the upgrade mechanism works
        const upgraded = await upgrades.upgradeProxy(await contract.getAddress(), PoDMV2, { unsafeAllow: ['constructor'] });
        expect(await upgraded.getAddress()).to.equal(await contract.getAddress());
    });

    it('should reject upgrade by non-owner', async () => {
        const { contract, fan } = await deployFixture();
        const PoDMV2 = await ethers.getContractFactory('PoDMPaymentProtocol', fan);
        await expect(
            upgrades.upgradeProxy(await contract.getAddress(), PoDMV2, { unsafeAllow: ['constructor'] })
        ).to.be.reverted;
    });
  });
});
