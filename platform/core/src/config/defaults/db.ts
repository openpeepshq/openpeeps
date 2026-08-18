import dotenv from 'dotenv';
dotenv.config();

export default {
  databaseUrl:
    process.env.DATABASE_URL ||
    'postgresql://openpeeps:openpeeps@localhost:5432/openpeeps',
};
