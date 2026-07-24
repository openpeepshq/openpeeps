import { logger } from '../../log';
import { exportArango } from './exportArango';
import { importPostgres } from './importPostgres';
import { exportDirFromEnv } from './shared';
import { validateMigration } from './validate';

const log = logger('core:migration:cli');

const usage = () => {
  console.log(`Usage: node dist/db/migration/cli.js <command>

Commands:
  export    Export ArangoDB collections to JSONL (DB_URL, DB_NAME)
  import    Import export into Postgres (DATABASE_URL)
  validate  Compare Postgres to import-stats.json (or export manifest) + checksums

Environment:
  MIGRATION_EXPORT_DIR  Export directory (default: ./arango-export)
  DB_URL                Arango server URL (default: http://localhost:8529)
  DB_NAME               Arango database name
  DATABASE_URL          Postgres connection string
`);
};

export const runCli = async (argv = process.argv.slice(2)) => {
  const [command] = argv;
  const exportDir = exportDirFromEnv();

  switch (command) {
    case 'export': {
      await exportArango(exportDir);
      return 0;
    }
    case 'import': {
      await importPostgres(exportDir);
      return 0;
    }
    case 'validate': {
      const result = await validateMigration(exportDir);
      return result.ok ? 0 : 1;
    }
    default:
      usage();
      if (command) {
        log.error('Unknown command: %s', command);
        return 1;
      }
      return 1;
  }
};

runCli()
  .then((code) => {
    if (code !== 0) {
      process.exitCode = code;
    }
  })
  .catch((err: unknown) => {
    log.error('Migration CLI failed', err);
    process.exitCode = 1;
  });
