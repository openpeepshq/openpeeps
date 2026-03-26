import dotenv from 'dotenv';
import { allpeepDb } from '@openpeeps/core/db';

dotenv.config();

console.log('Running migrations...');

await allpeepDb();

console.log('Migrations done');
