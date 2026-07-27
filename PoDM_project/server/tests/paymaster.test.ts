import { ethers } from 'ethers';

// The initCode format: 0x{address_40_hex}{data}
// buildInitCode returns: factory.toLowerCase() + factoryData.slice(2)
// where factory is "0x91E60e..." (has 0x prefix)

const FACTORY = '0x91E60e0613810449d098b0b5Ec8b51A0FE8c8985';

function buildInitCode(ownerAddress: string, salt = 0): string {
    // Simulate encodeFunctionData('createAccount', [owner, salt])
    const paddedOwner = ownerAddress.slice(2).toLowerCase().padStart(64, '0');
    const paddedSalt = salt.toString(16).padStart(64, '0');
    const data = '0xc5265d5d' + paddedOwner + '00000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000000';
    return FACTORY.toLowerCase() + data.slice(2);
}

function convertInitCode(initCode: string) {
    if (!initCode || initCode === '0x' || initCode.length <= 42) {
        return { factory: null, factoryData: null };
    }
    const raw = initCode.slice(2);
    return {
        factory: ethers.getAddress('0x' + raw.slice(0, 40)),
        factoryData: '0x' + raw.slice(40)
    };
}

describe('buildInitCode', () => {
    it('produces 0x-prefixed initCode', () => {
        const owner = '0x1234567890123456789012345678901234567890';
        const code = buildInitCode(owner, 0);
        expect(code.startsWith('0x')).toBe(true);
        expect(code.length).toBeGreaterThan(42);
    });
});

describe('initCode → factory/factoryData conversion', () => {
    const owner = '0xaac5d4240af87249b3f71bc8e4a2cae074a3e419';

    it('extracts checksummed factory address from non-deployed initCode', () => {
        const initCode = buildInitCode(owner, 0);
        const result = convertInitCode(initCode);
        expect(result.factory).toBe(FACTORY);
        expect(result.factoryData).toBeDefined();
        expect(result.factoryData!.startsWith('0x')).toBe(true);
        expect(result.factoryData!.length).toBeGreaterThan(2);
    });

    it('returns null for deployed (0x) initCode', () => {
        const result = convertInitCode('0x');
        expect(result.factory).toBeNull();
        expect(result.factoryData).toBeNull();
    });

    it('returns null for undefined initCode', () => {
        const result = convertInitCode('');
        expect(result.factory).toBeNull();
        expect(result.factoryData).toBeNull();
    });

    it('produces valid EIP-55 checksummed address', () => {
        const initCode = buildInitCode(owner, 0);
        const result = convertInitCode(initCode);
        // ethers.getAddress throws on invalid address
        const addr = result.factory!;
        expect(() => ethers.getAddress(addr)).not.toThrow();
        // Verify the checksum is correct (address should be unchanged by ethers.getAddress)
        expect(addr).toBe(ethers.getAddress(addr));
    });
});
