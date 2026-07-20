import dotenv from 'dotenv';
dotenv.config();

export default {
  url: process.env.DB_URL || 'http://localhost:8529',
  databaseName: process.env.DB_NAME || undefined,
  databaseUrl:
    process.env.DATABASE_URL ||
    'postgresql://openpeeps:openpeeps@localhost:5432/openpeeps',
};
