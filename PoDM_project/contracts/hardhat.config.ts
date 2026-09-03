import { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox';
import '@openzeppelin/hardhat-upgrades';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '..', '.env') });

const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY || '0000000000000000000000000000000000000000000000000000000000000000';

const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.28',
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  networks: {
    hardhat: {},
    baseSepolia: {
      url: process.env.BASE_TESTNET_RPC_URL || 'https://sepolia.base.org',
      chainId: 84532,
      accounts: [DEPLOYER_PRIVATE_KEY],
    },
    baseMainnet: {
      url: process.env.BASE_RPC_URL || 'https://mainnet.base.org',
      chainId: 8453,
      accounts: [DEPLOYER_PRIVATE_KEY],
    },
  },
  etherscan: {
    // Etherscan API V2 uses one account-wide key plus the network's chain ID.
    // The per-network API-key object targets the retired V1 endpoints.
    apiKey: process.env.BASESCAN_API_KEY || '',
  },
};

export default config;
