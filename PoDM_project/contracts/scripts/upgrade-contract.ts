import { ethers, upgrades } from 'hardhat';

async function main() {
  const proxyAddress = process.env.BASE_CONTRACT_ADDRESS || process.env.BASE_TESTNET_CONTRACT_ADDRESS;
  if (!proxyAddress) {
    throw new Error('Proxy address not found in environment (BASE_CONTRACT_ADDRESS / BASE_TESTNET_CONTRACT_ADDRESS)');
  }

  const network = await ethers.provider.getNetwork();
  console.log('=== PoDMPaymentProtocol Controlled Security Upgrade ===');
  console.log('Target Proxy Address:', proxyAddress);
  console.log('Network:', network.name, '(Chain ID:', network.chainId.toString(), ')');

  // Determine canonical USDC address per chain
  let usdcAddress = process.env.USDC_CONTRACT_ADDRESS;
  if (!usdcAddress) {
    if (network.chainId === 84532n) {
      usdcAddress = '0x036CbD53842c5426634e7929541eC2318f3dCF7e'; // Base Sepolia USDC
    } else if (network.chainId === 8453n) {
      usdcAddress = '0x833589fCD6eDb6E08f4c7C32D4f71b54bda02913'; // Base Mainnet USDC
    } else {
      throw new Error('USDC_CONTRACT_ADDRESS env var required for this network');
    }
  }

  console.log('Canonical USDC Address:', usdcAddress);

  // Deploy upgraded implementation & upgrade UUPS proxy
  console.log('\n1. Deploying upgraded implementation and executing UUPS upgrade...');
  const PoDMPaymentProtocol = await ethers.getContractFactory('PoDMPaymentProtocol');
  const upgraded = await upgrades.upgradeProxy(proxyAddress, PoDMPaymentProtocol, {
    unsafeAllow: ['constructor'],
  });
  await upgraded.waitForDeployment();

  const currentImplAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);
  console.log('Upgrade successful! Proxy:', proxyAddress, '-> New Implementation:', currentImplAddress);

  // Configure canonical USDC token address
  console.log('\n2. Setting canonical USDC token address on contract...');
  const contract = PoDMPaymentProtocol.attach(proxyAddress) as any;
  const tx = await contract.setUsdcToken(usdcAddress);
  await tx.wait();

  const configuredUsdc = await contract.usdcToken();
  console.log('Configured contract usdcToken:', configuredUsdc);

  if (configuredUsdc.toLowerCase() === usdcAddress.toLowerCase()) {
    console.log('\n=== Security Upgrade Completed Successfully ===');
  } else {
    throw new Error('USDC token configuration mismatch after upgrade!');
  }
}

main().catch((error) => {
  console.error('[Migration Error]:', error);
  process.exitCode = 1;
});
