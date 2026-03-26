import dotenv from 'dotenv';
dotenv.config();

export default {
  url: process.env.DB_URL || 'http://localhost:8529',
  databaseName: process.env.DB_NAME || undefined,
};
