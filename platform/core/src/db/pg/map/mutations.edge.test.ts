import { describe, expect, it, vi } from 'vitest';
import { updateDocument } from './mutations';
import type { MapData } from './queryTypes';

vi.mock('./relations', () => ({
  executeFind: vi.fn(async (_db, _collection, _mapData, id) => ({
    id,
    status: 'active',
    egressId: 'EG_test',
    createdAt: '2026-08-05T00:00:00.000Z',
    updatedAt: '2026-08-05T00:00:01.000Z',
    _from: 'profiles/p1',
    _to: 'posts/j1',
  })),
}));

describe('updateDocument for edge collections', () => {
  it('merges body patches for jamRecordings edges', async () => {
    const set = vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    });
    const db = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: 'rec1',
                fromId: 'p1',
                toId: 'j1',
                body: { status: 'requested' },
                createdAt: '2026-08-05T00:00:00.000Z',
                updatedAt: '2026-08-05T00:00:00.000Z',
              },
            ]),
          }),
        }),
      }),
      update: vi.fn().mockReturnValue({ set }),
    };

    const mapData = {
      collection: 'jamRecordings',
      keepMetadata: true,
    } as MapData<{ status?: string; egressId?: string }, { id: string }>;

    const updated = await updateDocument(db as never, mapData, 'rec1', {
      status: 'active',
      egressId: 'EG_test',
    });

    expect(db.update).toHaveBeenCalled();
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({
        body: { status: 'active', egressId: 'EG_test' },
      }),
    );
    expect(updated).toMatchObject({
      id: 'rec1',
      status: 'active',
      egressId: 'EG_test',
    });
  });
});
