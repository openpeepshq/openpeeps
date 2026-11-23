/**
 * Handler-level test for the voice-note cap's client-facing response shape
 * (#327, review item 2). The 90 s cap is enforced twice (client recorder +
 * server `transcodeIncomingMedia`), and the sync upload path maps a
 * `MediaContentError` to a 400. This pins the exact 400 a client sees when the
 * server rejects an over-cap audio — the only route a crafted upload can hit.
 * The handler's own branch logic runs unmocked; only its storage / DB /
 * processing dependencies are mocked.
 *
 * Known gap (see the `SYNC_PROCESSING_LIMIT` docs in `processing.ts`): a
 * crafted upload over the sync limit goes to the worker and the client is
 * told "processing" (202) before the cap is ever checked, so it bypasses the
 * 90 s cap until the worker runs — after the client already saw success.
 * TODO(media): move the voice-note cap check to the worker (or reject
 * over-limit audio before queuing) so the cap holds on the async path too;
 * track it as a follow-up to #327 so the 202 case below keeps pinning a
 * known-accepted trade-off rather than a silent regression.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { createMediaAttachmentHandler } from '#lib/handlers/media/createAttachment';

// vi.hoisted so the (hoisted) vi.mock factories can reach these before the
// top-level module body runs. One shared MediaContentError class so the
// handler's `error instanceof MediaContentError` and this test's
// `new MediaContentError(...)` are the very same class for the branch to fire.
// Factories reference the `h` binding (available in the hoisted scope), not
// destructured consts, which are still in their TDZ when a factory runs.
const h = vi.hoisted(() => {
  class MediaContentError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'MediaContentError';
    }
  }
  return {
    MediaContentError,
    runProcessing: vi.fn(),
    mediaProcessingQueue: vi.fn(() => ({ add: vi.fn() })),
    storeStream: vi.fn(),
    getPath: vi.fn((key: string, name: string) => `/media/${key}/${name}`),
    createMediaAttachment: vi.fn(),
  };
});
const { MediaContentError, runProcessing, storeStream, createMediaAttachment } =
  h;

vi.mock('#lib/auth', () => ({
  ensureLocalProfile: vi.fn(async () => undefined),
}));

vi.mock('@openpeepshq/common', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@openpeepshq/common')>();
  return { ...actual, mediaUploadLimitBytes: (mb: number) => mb * 1024 * 1024 };
});

vi.mock('@openpeepshq/core/config', () => ({
  config: vi.fn(async () => ({ media: { maxUploadMb: 20 } })),
}));

vi.mock('@openpeepshq/core/media', () => ({
  mediaStorage: vi.fn(() =>
    Promise.resolve({ storeStream: h.storeStream, getPath: h.getPath }),
  ),
  mediaProcessingQueue: h.mediaProcessingQueue,
  MediaContentError: h.MediaContentError,
  runProcessing: h.runProcessing,
  SYNC_PROCESSING_LIMIT: 1024 * 1024,
}));

vi.mock('@openpeepshq/core/mediaAttachments', () => ({
  createMediaAttachment: h.createMediaAttachment,
}));

const makeAudioFile = (size: number) =>
  ({
    name: 'voice.webm',
    type: 'audio/webm',
    size,
    stream: vi.fn(async () => 'stream'),
  }) as unknown as File;

const makeRequest = (file: File) =>
  ({ file, usage: 'post-audio', description: 'audio' }) as never;

describe('createMediaAttachmentHandler — over-cap audio 400 shape', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storeStream.mockResolvedValue({ key: 'k1', size: 100_000 });
    createMediaAttachment.mockResolvedValue({
      id: 'att1',
      status: 'processing',
    });
  });

  it('maps a MediaContentError from sync processing to a 400 carrying the cap message', async () => {
    runProcessing.mockRejectedValue(
      new MediaContentError('Audio exceeds the 90s voice-note limit.'),
    );

    await expect(
      createMediaAttachmentHandler(
        makeRequest(makeAudioFile(100_000)),
        {} as never,
      ),
    ).rejects.toMatchObject({
      status: 400,
      __HTTP_ERROR__: true,
      message: 'Audio exceeds the 90s voice-note limit.',
    });
  });

  it('does not downgrade a non-content processing error to a 400', async () => {
    const other = new Error('storage exploded');
    runProcessing.mockRejectedValue(other);

    await expect(
      createMediaAttachmentHandler(
        makeRequest(makeAudioFile(100_000)),
        {} as never,
      ),
    ).rejects.toBe(other);
  });

  it('returns 202 (worker) for an over-cap upload that exceeds the sync limit — the cap is only enforced on the sync path', async () => {
    // Over the 1 MB sync limit, so the handler skips runProcessing and queues.
    storeStream.mockResolvedValue({ key: 'k1', size: 2 * 1024 * 1024 });
    runProcessing.mockResolvedValue({ id: 'att1', status: 'ready' });

    const result = (await createMediaAttachmentHandler(
      makeRequest(makeAudioFile(2 * 1024 * 1024)),
      {} as never,
    )) as unknown as Response;

    expect(result).toBeInstanceOf(Response);
    expect(result.status).toBe(202);
    expect(runProcessing).not.toHaveBeenCalled();
    expect(h.mediaProcessingQueue()).toHaveProperty('add');
  });
});
