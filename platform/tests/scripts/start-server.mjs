import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../..',
);
const webDist = path.join(repoRoot, 'platform/web/dist/index.html');

if (!existsSync(webDist)) {
  console.error(
    'Missing platform/web/dist. Run: pnpm --filter @openpeepshq/server... build',
  );
  process.exit(1);
}

const env = {
  ...process.env,
  AUTO_MIGRATE_FROM_ARANGO: 'false',
  DB_NAME: process.env.DB_NAME ?? 'test',
  HOST: process.env.HOST ?? '127.0.0.1',
  PORT: process.env.PORT ?? '8080',
  NODE_ENV: 'development',
  FORCE_COLOR: '0',
  NO_COLOR: '1',
};

const child = spawn('pnpm', ['exec', 'vite-node', 'src/server.ts'], {
  cwd: path.join(repoRoot, 'platform/server'),
  env,
  stdio: 'inherit',
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});
