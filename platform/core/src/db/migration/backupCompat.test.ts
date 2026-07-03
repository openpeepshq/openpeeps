import { describe, expect, it } from 'vitest';
import { arangoDocToDocumentRow, arangoDocToEdgeRow } from './transform';
import {
  resolveBackupDatabaseType,
  type BackupMetadata,
} from '../../backups/metadata';

describe('resolveBackupDatabaseType', () => {
  it('defaults to arango when databaseType is missing', () => {
    expect(resolveBackupDatabaseType({})).toBe('arango');
    expect(resolveBackupDatabaseType(undefined)).toBe('arango');
  });

  it('recognizes postgres backups', () => {
    const metadata: BackupMetadata = { databaseType: 'postgres' };
    expect(resolveBackupDatabaseType(metadata)).toBe('postgres');
  });
});

describe('arango backup document transform', () => {
  it('maps an Arango account document to a Postgres row', () => {
    const row = arangoDocToDocumentRow('accounts', {
      _key: '01JTEST00000000000000000001',
      email: 'team@example.com',
      passwordHash: 'hash',
      emailValidated: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });

    expect(row).toMatchObject({
      id: '01JTEST00000000000000000001',
      email: 'team@example.com',
      passwordHash: 'hash',
      emailValidated: true,
    });
  });

  it('maps an Arango edge document to a Postgres edge row', () => {
    const row = arangoDocToEdgeRow('follows', {
      _key: '01JEDGE00000000000000000001',
      _from: 'profiles/alice',
      _to: 'profiles/bob',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });

    expect(row).toMatchObject({
      id: '01JEDGE00000000000000000001',
      fromId: 'alice',
      toId: 'bob',
    });
  });
});
