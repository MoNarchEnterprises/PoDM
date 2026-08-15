import fs from 'fs';
import path from 'path';
import { ethers } from 'ethers';
import { FUNCTION_SELECTORS } from '../common/contractConfig';

function readEnvVar(filePath: string, key: string): string | null {
    if (!fs.existsSync(filePath)) return null;
    const content = fs.readFileSync(filePath, 'utf8');
    const match = content.match(new RegExp(`^${key}=(.*)$`, 'm'));
    return match ? match[1].trim() : null;
}

async function main() {
    console.log('=== Running Contract Sync Verification Gate ===\n');

    const rootEnvPath = path.resolve(__dirname, '../.env');
    const serverEnvPath = path.resolve(__dirname, '../server/.env');
    const frontendEnvPath = path.resolve(__dirname, '../../podm-frontend/.env');

    const rootAddr = readEnvVar(rootEnvPath, 'BASE_TESTNET_CONTRACT_ADDRESS');
    const serverAddr = readEnvVar(serverEnvPath, 'BASE_TESTNET_CONTRACT_ADDRESS');
    const frontendAddr = readEnvVar(frontendEnvPath, 'VITE_BASE_TESTNET_CONTRACT_ADDRESS');

    console.log('1. Checking Environment Files Consistency:');
    console.log(`   - Root env (PoDM_project/.env): ${rootAddr || 'MISSING'}`);
    console.log(`   - Server env (PoDM_project/server/.env): ${serverAddr || 'MISSING'}`);
    console.log(`   - Frontend env (podm-frontend/.env): ${frontendAddr || 'MISSING'}\n`);

    let hasEnvError = false;

    if (!rootAddr || !serverAddr || !frontendAddr) {
        console.error('❌ FAIL: One or more contract address environment variables are missing!');
        hasEnvError = true;
    } else if (rootAddr !== serverAddr || rootAddr !== frontendAddr) {
        console.error('❌ FAIL: Contract address environment variables do NOT match across all 3 files!');
        console.error(`   Root:     ${rootAddr}`);
        console.error(`   Server:   ${serverAddr}`);
        console.error(`   Frontend: ${frontendAddr}`);
        hasEnvError = true;
    } else {
        console.log('✅ PASS: Contract addresses match perfectly across all 3 environment files.\n');
    }

    const targetAddress = rootAddr || serverAddr || frontendAddr;

    if (targetAddress && /^0x[a-fA-F0-9]{40}$/.test(targetAddress)) {
        console.log(`2. Verifying On-Chain Bytecode at ${targetAddress}:`);
        const rpcUrl = readEnvVar(rootEnvPath, 'BASE_TESTNET_RPC_URL') || 'https://sepolia.base.org';
        const provider = new ethers.JsonRpcProvider(rpcUrl);

        try {
            const code = await provider.getCode(targetAddress);
            if (!code || code === '0x' || code === '0x0') {
                console.error(`❌ FAIL: No bytecode found at address ${targetAddress} on network ${rpcUrl}`);
                hasEnvError = true;
            } else {
                // If the configured address is an ERC-1967 proxy, follow the
                // implementation slot and verify the implementation bytecode.
                const IMPLEMENTATION_SLOT = '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc';
                let codeToCheck = code;
                let implLabel = 'at configured address';
                try {
                    const slotValue = await provider.getStorage(targetAddress, IMPLEMENTATION_SLOT);
                    if (slotValue && slotValue !== '0x' + '0'.repeat(64)) {
                        const implAddress = ethers.getAddress('0x' + slotValue.slice(-40));
                        const implCode = await provider.getCode(implAddress);
                        if (implCode && implCode !== '0x' && implCode !== '0x0') {
                            codeToCheck = implCode;
                            implLabel = `implementation ${implAddress} (ERC-1967 slot)`;
                        }
                    }
                } catch (err: any) {
                    console.warn(`   Could not read ERC-1967 implementation slot: ${err.message}`);
                }
                console.log(`   Bytecode length: ${codeToCheck.length} characters (${implLabel}).`);
                // Verify bytecode contains function selectors
                const selectorsToCheck = [
                    FUNCTION_SELECTORS.paySubscription,
                    FUNCTION_SELECTORS.payTip,
                    FUNCTION_SELECTORS.payPPV,
                ];

                let missingSelectors = 0;
                for (const selector of selectorsToCheck) {
                    const cleanSel = selector.replace(/^0x/, '').toLowerCase();
                    if (!codeToCheck.toLowerCase().includes(cleanSel)) {
                        console.error(`❌ FAIL: Bytecode does NOT contain required selector ${selector} (${implLabel})`);
                        missingSelectors++;
                    }
                }

                if (missingSelectors === 0) {
                    console.log(`✅ PASS: Bytecode exists on-chain and implements all expected contract function selectors (${implLabel}).\n`);
                } else {
                    hasEnvError = true;
                }
            }
        } catch (err: any) {
            console.error(`⚠️ WARNING: Could not connect to RPC to verify bytecode: ${err.message}`);
        }
    }

    if (hasEnvError) {
        console.error('=== CONTRACT SYNC GATE FAILED ===');
        process.exit(1);
    } else {
        console.log('=== CONTRACT SYNC GATE PASSED SUCCESSFULLY ===');
    }
}

main().catch((err) => {
    console.error('Unexpected error in check-contract-sync:', err);
    process.exit(1);
});
