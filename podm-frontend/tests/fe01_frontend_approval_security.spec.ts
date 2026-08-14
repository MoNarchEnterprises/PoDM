import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test.describe('Phase 13: FE-01 Frontend Approval & Network Safety Suite', () => {
    test('verifies that no source file in podm-frontend contains infinite MaxUint256 approvals', async () => {
        function scanDir(dir: string): string[] {
            let files: string[] = [];
            const items = fs.readdirSync(dir, { withFileTypes: true });
            for (const item of items) {
                const fullPath = path.join(dir, item.name);
                if (item.isDirectory() && !item.name.includes('node_modules') && !item.name.includes('dist')) {
                    files = files.concat(scanDir(fullPath));
                } else if (item.isFile() && (item.name.endsWith('.ts') || item.name.endsWith('.tsx') || item.name.endsWith('.js'))) {
                    files.push(fullPath);
                }
            }
            return files;
        }

        const srcDir = path.resolve(process.cwd(), 'src');
        const allFiles = scanDir(srcDir);

        const forbiddenPatterns = [
            'MaxUint256',
            'maxUint256',
            'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
            '115792089237316195423570985008687907853269984665640564039457584007913129639935'
        ];

        const violations: string[] = [];

        for (const filePath of allFiles) {
            const content = fs.readFileSync(filePath, 'utf-8');
            for (const pattern of forbiddenPatterns) {
                if (content.includes(pattern)) {
                    violations.push(`${filePath} contains forbidden pattern: ${pattern}`);
                }
            }
        }

        expect(violations).toEqual([]);
    });

    test('verifies that useCryptoPayment hook enforces active wallet chain ID network binding', async () => {
        const hookPath = path.resolve(process.cwd(), 'src/shared/hooks/useCryptoPayment.ts');
        const content = fs.readFileSync(hookPath, 'utf-8');

        // Verify active chain ID check and automatic switch Ethereum chain call
        expect(content).toContain('rawChainId !== expectedChainId');
        expect(content).toContain('wallet_switchEthereumChain');
        expect(content).toContain('Network Mismatch');
    });
});
