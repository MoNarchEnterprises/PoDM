import { cp, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const source = resolve(projectRoot, '..', 'docs');
const target = resolve(projectRoot, 'public', 'docs');

if (!existsSync(source)) {
  console.error('Source not found at', source);
  process.exit(1);
}

if (!existsSync(resolve(projectRoot, 'public'))) {
  await mkdir(resolve(projectRoot, 'public'), { recursive: true });
}

await cp(source, target, { recursive: true });
console.log('Docs copied to public/docs/');
