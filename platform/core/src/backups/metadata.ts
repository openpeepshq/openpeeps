export type BackupDatabaseType = 'arango' | 'postgres';

export type BackupMetadata = {
  databaseType?: BackupDatabaseType;
  config?: {
    hostname?: string;
  };
};

/** Legacy Arango backups omit databaseType; treat them as Arango JSONL. */
export const resolveBackupDatabaseType = (
  metadata?: BackupMetadata,
): BackupDatabaseType =>
  metadata?.databaseType === 'postgres' ? 'postgres' : 'arango';
