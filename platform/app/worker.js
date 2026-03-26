import dotenv from 'dotenv';
import { start } from '@openpeeps/worker';

dotenv.config();

console.log('Starting worker...');

start().then();
