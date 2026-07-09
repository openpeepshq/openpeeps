import { describe, expect, it } from 'vitest';
import { arangoDocToDocumentRow, arangoDocToEdgeRow } from './transform';
import { dedupeRowsById } from './importCollections';
import {
  resolveBackupDatabaseType,
  type BackupMetadata,
} from '../../backups/metadata';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

  it('treats empty-string timestamps as missing when mapping configs', () => {
    const row = arangoDocToDocumentRow('configs', {
      _key: 'openpeeps-core',
      config: { server: { signUpsOpen: true } },
      createdAt: '',
      updatedAt: '',
      deletedAt: '',
    });

    expect(row.key).toBe('openpeeps-core');
    expect(row.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(row.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(row.deletedAt).toBeNull();
    expect(row.createdAt).not.toBe('');
    expect(row.updatedAt).not.toBe('');
  });

  it('assigns a uuid id when Arango i18n used locale as _key', () => {
    const row = arangoDocToDocumentRow('i18n', {
      _key: 'en',
      locale: 'en',
      namespace: 'translation',
      translations: {
        navigation: { myFeed: 'My Feed' },
      },
      createdAt: '2026-04-20T16:22:38.214Z',
      updatedAt: '2025-07-02T21:59:51.661Z',
    });

    expect(row.locale).toBe('en');
    expect(row.namespace).toBe('translation');
    expect(row.id).toMatch(UUID_REGEX);
    expect(row.id).not.toBe('en');
  });

  it('keeps an existing uuid id on Arango i18n documents', () => {
    const existingId = '01934567-89ab-7def-8123-456789abcdef';
    const row = arangoDocToDocumentRow('i18n', {
      _key: 'en',
      id: existingId,
      locale: 'en',
      namespace: 'translation',
      body: { common: { edit: 'Edit' } },
    });

    expect(row.id).toBe(existingId);
  });

  it('derives creatorId for legacy posts from entries import context', () => {
    const postId = '01964459-8893-7cb5-b88d-df3a1badee15';
    const profileId = '018f1ad9-a891-7518-9c48-3b9003de56b3';
    const row = arangoDocToDocumentRow(
      'posts',
      {
        _key: postId,
        type: 'note',
        visibility: 'local',
        content: 'Hello',
        createdAt: '2025-04-17T15:24:00.532Z',
        updatedAt: '2025-04-17T15:24:00.532Z',
      },
      { postCreatorIdByPostId: new Map([[postId, profileId]]) },
    );

    expect(row.creatorId).toBe(profileId);
  });

  it('maps legacy profile settings id to profileId', () => {
    const profileId = '019585f8-213d-7316-b4dd-f450e540c0c6';
    const row = arangoDocToDocumentRow('profileSettings', {
      _key: profileId,
      theme: 'community',
      createdAt: '2025-12-23T06:36:32.406Z',
      updatedAt: '2025-12-23T06:36:32.406Z',
    });

    expect(row.id).toBe(profileId);
    expect(row.profileId).toBe(profileId);
    expect(row.body).toEqual({ theme: 'community' });
  });

  it('maps legacy jamId to postId when importing jam events', () => {
    const jamId = '01997695-d91b-77cd-aad7-335215eaf3df';
    const row = arangoDocToDocumentRow('jamEvents', {
      _key: '01997697-1e21-7840-a6ba-9adb76c6aacb',
      jamId,
      type: 'start',
      profileId: '019585f8-213d-7316-b4dd-f450e540c0c6',
      createdAt: '2025-09-23T12:40:52.251Z',
      updatedAt: '2025-09-23T12:40:52.251Z',
    });

    expect(row.postId).toBe(jamId);
    expect(row.body).toMatchObject({
      type: 'start',
      profileId: '019585f8-213d-7316-b4dd-f450e540c0c6',
    });
    expect(row.body).not.toHaveProperty('jamId');
  });

  it('keeps an explicit creatorId on posts when present', () => {
    const creatorId = '018f1ad9-a891-7518-9c48-3b9003de56b3';
    const row = arangoDocToDocumentRow('posts', {
      _key: '01964459-8893-7cb5-b88d-df3a1badee15',
      type: 'note',
      visibility: 'local',
      creatorId,
      data: { content: 'Hello', type: 'note' },
      createdAt: '2025-04-17T15:24:00.532Z',
      updatedAt: '2025-04-17T15:24:00.532Z',
    });

    expect(row.creatorId).toBe(creatorId);
  });

  it('preserves legacy Arango data migration keys that are not UUIDs', () => {
    const row = arangoDocToDocumentRow('dataMigrations', {
      _key: '019637a0-1200-7000-8000-resource-type-legacy',
      appliedAt: '2026-05-22T16:10:06.575Z',
    });

    expect(row).toEqual({
      id: '019637a0-1200-7000-8000-resource-type-legacy',
      appliedAt: '2026-05-22T16:10:06.575Z',
    });
  });

  it('maps legacy notification actorId to profileId', () => {
    const recipientId = '01980bb2-2e56-7d31-8ee2-d002ed67fcb2';
    const row = arangoDocToDocumentRow('notifications', {
      _key: '019dda39-9d97-7da7-aaf6-de174e170688',
      actorId: recipientId,
      type: 'jamStarted',
      fromProfileId: '018e61da-b213-7e1c-8093-daec21e8e324',
      postId: '019bb222-8109-7087-97ed-244754f53076',
      emailHandled: true,
      pushHandled: true,
      createdAt: '2026-04-29T17:11:42.232Z',
      updatedAt: '2026-04-29T17:11:42.232Z',
    });

    expect(row.profileId).toBe(recipientId);
  });
});

describe('import row deduplication', () => {
  it('keeps the last row per id across batches', () => {
    const rows = dedupeRowsById([
      { id: 'a', value: 1 },
      { id: 'b', value: 1 },
      { id: 'a', value: 2 },
    ]);

    expect(rows).toHaveLength(2);
    expect(rows.find((row) => row.id === 'a')?.value).toBe(2);
    expect(rows.find((row) => row.id === 'b')?.value).toBe(1);
  });
});
