import {
    getChainNetwork,
    getRpcUrl,
    getUsdcAddress,
    getChainId,
    getChainNamespace,
    getContractConfig
} from '../utils/contract.utils';

describe('contract.utils network decoupling', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        process.env = { ...originalEnv };
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    describe('getChainNetwork', () => {
        it('defaults to testnet when CHAIN_NETWORK is unset', () => {
            delete process.env.CHAIN_NETWORK;
            expect(getChainNetwork()).toBe('testnet');
        });

        it('returns testnet when CHAIN_NETWORK=testnet', () => {
            process.env.CHAIN_NETWORK = 'testnet';
            expect(getChainNetwork()).toBe('testnet');
        });

        it('returns mainnet when CHAIN_NETWORK=mainnet regardless of NODE_ENV', () => {
            process.env.CHAIN_NETWORK = 'mainnet';
            process.env.NODE_ENV = 'development';
            expect(getChainNetwork()).toBe('mainnet');
        });

        it('remains testnet when NODE_ENV=production but CHAIN_NETWORK is testnet or unset', () => {
            process.env.NODE_ENV = 'production';
            delete process.env.CHAIN_NETWORK;
            expect(getChainNetwork()).toBe('testnet');

            process.env.CHAIN_NETWORK = 'testnet';
            expect(getChainNetwork()).toBe('testnet');
        });
    });

    describe('network helper outputs', () => {
        it('returns testnet configuration when CHAIN_NETWORK=testnet', () => {
            process.env.CHAIN_NETWORK = 'testnet';
            process.env.NODE_ENV = 'production'; // Node env shouldn't override chain network!

            expect(getChainId()).toBe(84532);
            expect(getChainNamespace()).toBe('base-sepolia');
            expect(getUsdcAddress()).toBe('0x036CbD53842c5426634e7929541eC2318f3dCF7e');
            expect(getRpcUrl()).toContain('sepolia');
        });

        it('returns mainnet configuration when CHAIN_NETWORK=mainnet', () => {
            process.env.CHAIN_NETWORK = 'mainnet';

            expect(getChainId()).toBe(8453);
            expect(getChainNamespace()).toBe('base');
            expect(getUsdcAddress()).toBe('0x833589fCD6eDb6E08f4c7C32D4f71b54bda02913');
            expect(getRpcUrl()).toContain('mainnet');
        });
    });

    describe('getContractConfig fail-fast validation', () => {
        it('returns valid testnet config when testnet contract address is set', () => {
            process.env.CHAIN_NETWORK = 'testnet';
            process.env.NODE_ENV = 'production';
            process.env.BASE_TESTNET_CONTRACT_ADDRESS = '0xa8f480C42C6216a35a435424409d8e0932ee66e9';

            const config = getContractConfig();
            expect(config.contractAddress).toBe('0xa8f480C42C6216a35a435424409d8e0932ee66e9');
            expect(config.chainId).toBe(84532);
            expect(config.isProd).toBe(true);
        });

        it('throws error when active network contract address is empty', () => {
            process.env.CHAIN_NETWORK = 'testnet';
            delete process.env.BASE_TESTNET_CONTRACT_ADDRESS;

            expect(() => getContractConfig()).toThrow(/Invalid or unconfigured smart contract address/);
        });

        it('throws error when active network contract address is a PLACEHOLDER_', () => {
            process.env.CHAIN_NETWORK = 'mainnet';
            process.env.BASE_CONTRACT_ADDRESS = 'PLACEHOLDER_BASE_MAINNET_CONTRACT_ADDRESS';

            expect(() => getContractConfig()).toThrow(/Invalid or unconfigured smart contract address/);
        });
    });
});
