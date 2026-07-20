import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/pg/schema/index.ts',
  out: './src/db/pg/sql',
  dialect: 'postgresql',
  dbCredentials: {
    url:
      process.env.DATABASE_URL ??
      'postgresql://openpeeps:openpeeps@localhost:5432/openpeeps',
  },
});
