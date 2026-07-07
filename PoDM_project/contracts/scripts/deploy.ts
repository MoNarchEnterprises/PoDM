import { ethers } from 'hardhat';

async function main() {
  const platformTreasury = process.env.PLATFORM_TREASURY_ADDRESS;
  if (!platformTreasury) {
    throw new Error('PLATFORM_TREASURY_ADDRESS env var is required');
  }

  const platformFeeBps = parseInt(process.env.PLATFORM_FEE_BPS || '1250', 10);
  if (platformFeeBps > 3000) {
    throw new Error('Platform fee BPS cannot exceed 3000 (30%)');
  }

  console.log('Deploying PoDMPaymentProtocol...');
  console.log('Platform Treasury:', platformTreasury);
  console.log('Platform Fee (BPS):', platformFeeBps);

  const PoDMPaymentProtocol = await ethers.getContractFactory('PoDMPaymentProtocol');
  const contract = await PoDMPaymentProtocol.deploy(platformTreasury, platformFeeBps);
  await contract.waitForDeployment();

  const contractAddress = await contract.getAddress();
  console.log('PoDMPaymentProtocol deployed to:', contractAddress);

  const network = await ethers.provider.getNetwork();
  console.log('Network:', network.name, '(chain ID:', network.chainId, ')');

  console.log('');
  console.log('Set these env vars in your .env:');
  console.log(`BASE_CONTRACT_ADDRESS=${contractAddress}`);
  if (network.chainId === 84532n) {
    console.log(`BASE_TESTNET_CONTRACT_ADDRESS=${contractAddress}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
