export type BackupDatabaseType = 'postgres';

export type BackupMetadata = {
  databaseType?: BackupDatabaseType;
  /** When this backup archive was created (ISO-8601). */
  createdAt?: string;
  /**
   * Drizzle journal tag the database was on when the backup was created
   * (e.g. `0007_shallow_oracle`).
   */
  schemaVersion?: string;
  config?: {
    hostname?: string;
  };
};

export const resolveBackupDatabaseType = (
  metadata?: BackupMetadata,
): BackupDatabaseType => {
  if (metadata?.databaseType === 'postgres') {
    return 'postgres';
  }
  throw new Error(
    'Backup is not a Postgres JSONL archive (missing metadata.json databaseType: "postgres")',
  );
};
