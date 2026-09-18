import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DbPost } from '@openpeepshq/common/types';

vi.mock('../db', () => ({
  allpeepDb: vi.fn(),
}));

vi.mock('./replyClosure', () => ({
  collectReplyClosureIds: vi.fn(),
}));

vi.mock('../db/pg/map/relations', () => ({
  fetchRowsByIds: vi.fn(),
  hydrateMapData: vi.fn(),
}));

vi.mock('./mapping', () => ({
  EMBEDDED_LATEST_REPLIES_LIMIT: 3,
  threadPreviewMappingForProfile: () => ({
    data: () => ({ collection: 'posts', softDelete: true }),
  }),
}));

import { allpeepDb } from '../db';
import { collectReplyClosureIds } from './replyClosure';
import { fetchRowsByIds, hydrateMapData } from '../db/pg/map/relations';
import { loadThreadPreviewReplies } from './threadPreview';

describe('loadThreadPreviewReplies', () => {
  beforeEach(() => {
    vi.mocked(allpeepDb).mockResolvedValue({ db: {} } as never);
    vi.mocked(collectReplyClosureIds).mockReset();
    vi.mocked(fetchRowsByIds).mockReset();
    vi.mocked(hydrateMapData).mockReset();
  });

  it('returns empty when the closure is empty', async () => {
    vi.mocked(collectReplyClosureIds).mockResolvedValue([]);
    await expect(loadThreadPreviewReplies('root')).resolves.toEqual({
      replies: [],
      hasMore: false,
    });
  });

  it('hydrates the newest three descendants and attaches non-root parents', async () => {
    const child = { id: 'c', inReplyToId: 'p' } as DbPost;
    const parent = { id: 'p', inReplyToId: 'nested' } as DbPost;
    vi.mocked(collectReplyClosureIds).mockResolvedValue([
      'c',
      'b',
      'a',
      'extra',
    ]);
    vi.mocked(fetchRowsByIds)
      .mockResolvedValueOnce([{ id: 'c' }])
      .mockResolvedValueOnce([{ id: 'p' }]);
    vi.mocked(hydrateMapData)
      .mockResolvedValueOnce([child])
      .mockResolvedValueOnce([parent]);

    const result = await loadThreadPreviewReplies('root');
    expect(result.hasMore).toBe(true);
    expect(result.replies).toEqual([{ ...child, replyTo: parent }]);
    expect(vi.mocked(collectReplyClosureIds).mock.calls[0]?.[3]).toMatchObject({
      newestFirst: true,
      limit: 4,
    });
  });
});
