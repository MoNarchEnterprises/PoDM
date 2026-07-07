import { expect } from 'chai';
import { ethers } from 'hardhat';
import { time } from '@nomicfoundation/hardhat-toolbox/network-helpers';

describe('PoDMPaymentProtocol', function () {
  async function deployFixture() {
    const [owner, treasury, creator, fan] = await ethers.getSigners();

    const PoDMPaymentProtocol = await ethers.getContractFactory('PoDMPaymentProtocol');
    const contract = await PoDMPaymentProtocol.deploy(treasury.address, 1250);
    await contract.waitForDeployment();
    const contractAddress = await contract.getAddress();

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
        contract.connect(fan).processRenewal(
          ethers.ZeroAddress, fan.address, creator.address, amount
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
        contract.connect(fan).processRenewal(
          ethers.ZeroAddress, fan.address, creator.address, excessive
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
          ethers.ZeroAddress, creator.address, ethers.parseUnits('10', 6), ethers.ZeroHash
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
});
