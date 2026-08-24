import { describe, expect, it } from 'vitest';
import { resolveBackupDatabaseType, type BackupMetadata } from './metadata';

describe('BackupMetadata', () => {
  it('accepts createdAt and schemaVersion on postgres backups', () => {
    const metadata: BackupMetadata = {
      databaseType: 'postgres',
      createdAt: '2026-08-20T15:00:00.000Z',
      schemaVersion: '0006_fine_trish_tilby',
      config: { hostname: 'example.ap.social' },
    };
    expect(resolveBackupDatabaseType(metadata)).toBe('postgres');
    expect(metadata.createdAt).toBe('2026-08-20T15:00:00.000Z');
    expect(metadata.schemaVersion).toBe('0006_fine_trish_tilby');
  });
});
