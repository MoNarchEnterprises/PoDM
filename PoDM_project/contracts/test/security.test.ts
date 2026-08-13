import { expect } from 'chai';
import { ethers, upgrades } from 'hardhat';

describe('PoDMPaymentProtocol Security & Invariants', function () {
  async function securityFixture() {
    const [owner, treasury, creator, fan, attacker] = await ethers.getSigners();
    const PoDMPaymentProtocol = await ethers.getContractFactory('PoDMPaymentProtocol');
    const proxy = await upgrades.deployProxy(
      PoDMPaymentProtocol,
      [treasury.address, 1250],
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

    // Set canonical USDC
    await contract.setUsdcToken(await usdc.getAddress());

    return { contract, usdc, fakeToken, owner, treasury, creator, fan, attacker };
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
      const { contract, fakeToken, creator, fan } = await securityFixture();
      const amount = ethers.parseUnits('10', 6);
      await contract.connect(fan).approveRecurringSubscription(creator.address, amount, 86400);

      await expect(
        contract.processRenewal(
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
      const { contract, fakeToken, creator } = await securityFixture();
      const amount = ethers.parseUnits('10', 6);

      await expect(
        contract.processPayout(
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

    it('should enforce onlyOwner for setUsdcToken', async () => {
      const { contract, attacker, fakeToken } = await securityFixture();
      await expect(
        contract.connect(attacker).setUsdcToken(await fakeToken.getAddress())
      ).to.be.reverted;
    });

    it('should reject setUsdcToken with zero address', async () => {
      const { contract } = await securityFixture();
      await expect(
        contract.setUsdcToken(ethers.ZeroAddress)
      ).to.be.revertedWith('Invalid USDC address');
    });
  });
});
