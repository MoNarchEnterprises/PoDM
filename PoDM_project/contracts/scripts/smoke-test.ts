import { ethers } from 'hardhat';
import { PODM_CONTRACT_ABI } from '../../common/contractConfig';

async function main() {
    const address = process.env.CONTRACT_ADDRESS || process.env.BASE_TESTNET_CONTRACT_ADDRESS;
    if (!address) {
        console.error('Usage: CONTRACT_ADDRESS=0x... npx hardhat run scripts/smoke-test.ts --network baseSepolia');
        process.exit(1);
    }

    console.log(`=== Smoke Testing Contract at ${address} ===`);

    const provider = ethers.provider;
    const code = await provider.getCode(address);

    if (!code || code === '0x') {
        console.error(`❌ FAIL: No bytecode found at ${address}`);
        process.exit(1);
    }

    console.log(`✅ Bytecode verified (${code.length} bytes)`);

    const contract = new ethers.Contract(address, PODM_CONTRACT_ABI, provider);

    try {
        const treasury = await (contract as any).platformTreasury();
        console.log(`✅ platformTreasury(): ${treasury}`);
    } catch (e: any) {
        console.warn(`⚠️ Could not query platformTreasury: ${e.message}`);
    }

    try {
        const feeBps = await (contract as any).platformFeeBps();
        console.log(`✅ platformFeeBps(): ${feeBps.toString()}`);
    } catch (e: any) {
        console.warn(`⚠️ Could not query platformFeeBps: ${e.message}`);
    }

    console.log('=== Smoke Test Complete ===');
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
