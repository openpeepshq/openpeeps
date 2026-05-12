import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';

const here = path.dirname(fileURLToPath(import.meta.url));
/** Parent of `src/` or `dist/` → `platform/server` */
const serverDir = path.resolve(here, '..');

config({ path: path.join(serverDir, '.env') });
