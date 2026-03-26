import dotenv from 'dotenv';
dotenv.config();

export default {
  host: process.env.REDIS_HOST || 'localhost',
};
