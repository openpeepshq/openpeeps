export type BackupDatabaseType = 'arango' | 'postgres';

export type BackupMetadata = {
  databaseType?: BackupDatabaseType;
  /** When this backup archive was created (ISO-8601). */
  createdAt?: string;
  config?: {
    hostname?: string;
  };
};

/** Legacy Arango backups omit databaseType; treat them as Arango JSONL. */
export const resolveBackupDatabaseType = (
  metadata?: BackupMetadata,
): BackupDatabaseType =>
  metadata?.databaseType === 'postgres' ? 'postgres' : 'arango';
