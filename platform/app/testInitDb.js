import dotenv from 'dotenv';
import { allpeepDb } from '@openpeeps/core/db';

dotenv.config();

console.log('Starting testInitDb...');

const { db } = await allpeepDb();

const result = await db.query(`
    let cs = { add: ['core-groups-read'], 'remove': ['*'] }
    RETURN ALLPEEP::checkCapabilities(['core-groups-read'], cs)
`).then(r => r.all());

console.log(result);
