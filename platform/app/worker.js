import dotenv from 'dotenv';

dotenv.config();

const { start } = await import('@openpeeps/worker');

console.log('Starting worker...');

await start();
