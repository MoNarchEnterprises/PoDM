import fs from 'fs';
import path from 'path';

function updateEnvFile(filePath: string, key: string, newAddress: string) {
    if (!fs.existsSync(filePath)) {
        console.warn(`[sync-contract-env] File not found: ${filePath}`);
        return;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    const regex = new RegExp(`^${key}=.*$`, 'm');

    if (regex.test(content)) {
        content = content.replace(regex, `${key}=${newAddress}`);
    } else {
        content += `\n${key}=${newAddress}\n`;
    }

    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`[sync-contract-env] Updated ${filePath} -> ${key}=${newAddress}`);
}

function main() {
    const newAddress = process.argv[2];
    if (!newAddress || !/^0x[a-fA-F0-9]{40}$/.test(newAddress)) {
        console.error('Usage: npx ts-node scripts/sync-contract-env.ts <0xContractAddress>');
        process.exit(1);
    }

    const rootEnv = path.resolve(__dirname, '../.env');
    const serverEnv = path.resolve(__dirname, '../server/.env');
    const frontendEnv = path.resolve(__dirname, '../../podm-frontend/.env');

    updateEnvFile(rootEnv, 'BASE_TESTNET_CONTRACT_ADDRESS', newAddress);
    updateEnvFile(serverEnv, 'BASE_TESTNET_CONTRACT_ADDRESS', newAddress);
    updateEnvFile(frontendEnv, 'VITE_BASE_TESTNET_CONTRACT_ADDRESS', newAddress);

    console.log('\nContract address synchronized across all 3 environment files successfully!');
}

main();
