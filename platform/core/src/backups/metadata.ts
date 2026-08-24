export type BackupDatabaseType = 'arango' | 'postgres';

export type BackupMetadata = {
  databaseType?: BackupDatabaseType;
  /** When this backup archive was created (ISO-8601). */
  createdAt?: string;
  /**
   * Drizzle journal tag the database was on when the backup was created
   * (e.g. `0006_fine_trish_tilby`). Omitted on legacy Arango archives.
   */
  schemaVersion?: string;
  config?: {
    hostname?: string;
  };
};

/** Legacy Arango backups omit databaseType; treat them as Arango JSONL. */
export const resolveBackupDatabaseType = (
  metadata?: BackupMetadata,
): BackupDatabaseType =>
  metadata?.databaseType === 'postgres' ? 'postgres' : 'arango';
