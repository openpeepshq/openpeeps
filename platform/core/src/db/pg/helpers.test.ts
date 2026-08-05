import { describe, expect, it, vi } from 'vitest';
import { insertEdge } from './helpers';

describe('insertEdge', () => {
  it('uses a provided body.id as the row id and omits it from jsonb', async () => {
    const values = vi.fn().mockResolvedValue(undefined);
    const db = {
      insert: vi.fn().mockReturnValue({ values }),
    };

    const id = await insertEdge(
      db as never,
      { fromId: {}, toId: {} },
      'profile-1',
      'post-1',
      { id: 'rec-fixed', status: 'requested' },
    );

    expect(id).toBe('rec-fixed');
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'rec-fixed',
        fromId: 'profile-1',
        toId: 'post-1',
        body: { status: 'requested' },
      }),
    );
  });

  it('generates an id when body has none', async () => {
    const values = vi.fn().mockResolvedValue(undefined);
    const db = {
      insert: vi.fn().mockReturnValue({ values }),
    };

    const id = await insertEdge(
      db as never,
      { fromId: {}, toId: {} },
      'profile-1',
      'post-1',
      { status: 'requested' },
    );

    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        id,
        body: { status: 'requested' },
      }),
    );
  });
});
