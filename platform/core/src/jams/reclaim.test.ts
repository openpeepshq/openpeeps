import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PostWithMeta } from '@openpeepshq/common/types';
import { listJamStarts } from './finders';
import * as mutations from './mutations';
import { shouldReclaimJamRoom, writeReclaimClose } from './livekit';

vi.mock('./finders', () => ({
  listJamStarts: vi.fn(),
}));
vi.mock('./mutations', () => ({
  createJamEvent: vi.fn().mockResolvedValue(undefined),
}));

const jam = { id: '01970000-0000-7000-8000-000000000001' } as PostWithMeta;

describe('shouldReclaimJamRoom', () => {
  it('leaves an empty room alone so a host can finish connecting', () => {
    expect(shouldReclaimJamRoom(0, 0)).toBe(false);
  });

  it('leaves a room with people in it alone', () => {
    expect(shouldReclaimJamRoom(2, 2)).toBe(false);
  });

  it('reclaims a room held open only by egress', () => {
    expect(shouldReclaimJamRoom(1, 0)).toBe(true);
  });
});

describe('writeReclaimClose', () => {
  afterEach(() => {
    vi.mocked(listJamStarts).mockReset();
    vi.mocked(mutations.createJamEvent)
      .mockReset()
      .mockResolvedValue(undefined);
  });

  it("resolves the occurrence from the crashed session's start", async () => {
    const occurrence = '2026-09-17T18:00:00.000Z';
    vi.mocked(listJamStarts).mockResolvedValue([
      { recurrenceId: occurrence } as never,
    ]);

    await writeReclaimClose(jam);

    expect(listJamStarts).toHaveBeenCalledWith(jam.id);
    expect(mutations.createJamEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        jamId: jam.id,
        type: 'close',
        profileId: 'system',
        recurrenceId: occurrence,
      }),
    );
  });

  it('keeps a caller-supplied occurrence and does not look one up', async () => {
    const occurrence = '2026-09-17T18:00:00.000Z';

    await writeReclaimClose(jam, occurrence);

    expect(listJamStarts).not.toHaveBeenCalled();
    expect(mutations.createJamEvent).toHaveBeenCalledWith(
      expect.objectContaining({ recurrenceId: occurrence }),
    );
  });

  it('writes a null-occurrence close when the session has no start', async () => {
    vi.mocked(listJamStarts).mockResolvedValue([]);

    await writeReclaimClose(jam);

    expect(mutations.createJamEvent).toHaveBeenCalledWith(
      expect.objectContaining({ recurrenceId: undefined }),
    );
  });
});
