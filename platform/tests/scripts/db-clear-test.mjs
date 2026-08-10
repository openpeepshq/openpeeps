import { config } from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../..',
);

config({ path: path.join(repoRoot, '.env') });
config({ path: path.join(repoRoot, 'platform/server/.env') });

process.env.DB_NAME = process.env.DB_NAME || 'test';
process.argv = [process.argv[0], process.argv[1], 'db', 'clear'];

const { cli } = await import('@openpeepshq/cli');
await cli();
