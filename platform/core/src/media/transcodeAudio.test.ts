import { afterEach, describe, expect, it, vi } from 'vitest';
import { MediaContentError, transcodeIncomingMedia } from './index';

/**
 * Mock fluent-ffmpeg at the boundary so the audio-branch decision logic (which
 * uploads transcode vs. pass through, the `.m4a` filename derivation, the
 * `audio/mp4` rewrite) is tested without a real ffmpeg encoder. The `vi.mock`
 * factory is hoisted, so the mock function and its mutable outcome must live
 * inside `vi.hoisted`.
 */
const { ffmpegMock, ffprobeMock, setOutcome, setDuration } = vi.hoisted(() => {
  const buildChain = (outcome: { kind: 'ok' } | { error: string }): unknown => {
    const handlers: Record<string, (a?: unknown, b?: unknown) => void> = {};
    const chain = {
      noVideo: () => chain,
      outputOptions: () => chain,
      output: () => chain,
      on: (event: string, cb: (...a: unknown[]) => void) => {
        handlers[event] = cb;
        return chain;
      },
      run: () => {
        if ('error' in outcome) handlers['error']?.(new Error(outcome.error));
        else handlers['end']?.();
      },
    };
    return chain;
  };
  let outcome: { kind: 'ok' } | { error: string } = { kind: 'ok' };
  let duration: number | null = 30;
  const ffmpegMock = vi.fn(() => buildChain(outcome));
  // ffprobe reports `metadata.format.duration`; `null` simulates an
  // un-probeable file so the fail-closed path is testable.
  const ffprobeMock = vi.fn(
    (inputPath: string, cb: (e: unknown, m: unknown) => void) => {
      cb(null, { format: { duration } });
      return inputPath;
    },
  );
  return {
    ffmpegMock,
    ffprobeMock,
    setOutcome: (o: { kind: 'ok' } | { error: string }) => {
      outcome = o;
    },
    setDuration: (d: number | null) => {
      duration = d;
    },
  };
});

vi.mock('fluent-ffmpeg', () => ({
  default: Object.assign(ffmpegMock, { ffprobe: ffprobeMock }),
}));

describe('transcodeIncomingMedia — audio normalization', () => {
  afterEach(() => {
    ffmpegMock.mockClear();
    ffprobeMock.mockClear();
    setOutcome({ kind: 'ok' });
    setDuration(30);
  });

  it('transcodes webm/opus (browser recordings) to a fresh .m4a / audio/mp4', async () => {
    const result = await transcodeIncomingMedia(
      'audio',
      '/tmp/in.webm',
      'voice.webm',
      'audio/webm;codecs=opus',
    );
    expect(ffmpegMock).toHaveBeenCalled();
    // The ffmpeg chain must be the audio path (noVideo), not the video path.
    const lastChain = ffmpegMock.mock.results.at(-1)?.value as {
      noVideo: unknown;
    };
    expect(lastChain.noVideo).toBeTypeOf('function');
    // Output is a fresh temp .m4a (not the input) declared as audio/mp4.
    expect(result.path).not.toBe('/tmp/in.webm');
    expect(result.path).toMatch(/\.m4a$/);
    expect(result.filename).toBe('voice.m4a');
    expect(result.mimetype).toBe('audio/mp4');
  });

  it('transcodes audio/ogg too (only mp4/mpeg/aac pass through)', async () => {
    const result = await transcodeIncomingMedia(
      'audio',
      '/tmp/in.ogg',
      'note.ogg',
      'audio/ogg;codecs=opus',
    );
    expect(ffmpegMock).toHaveBeenCalled();
    expect(result.filename).toBe('note.m4a');
    expect(result.mimetype).toBe('audio/mp4');
  });

  it('passes audio/mp4 through untouched (no transcode)', async () => {
    const result = await transcodeIncomingMedia(
      'audio',
      '/tmp/in.m4a',
      'voice.m4a',
      'audio/mp4',
    );
    expect(ffmpegMock).not.toHaveBeenCalled();
    expect(result.path).toBe('/tmp/in.m4a');
    expect(result.filename).toBe('voice.m4a');
    expect(result.mimetype).toBe('audio/mp4');
  });

  it('passes audio/mpeg through untouched', async () => {
    const result = await transcodeIncomingMedia(
      'audio',
      '/tmp/in.mp3',
      'voice.mp3',
      'audio/mpeg',
    );
    expect(ffmpegMock).not.toHaveBeenCalled();
    expect(result.path).toBe('/tmp/in.mp3');
    expect(result.filename).toBe('voice.mp3');
    expect(result.mimetype).toBe('audio/mpeg');
  });

  it('rejects when the audio transcode fails', async () => {
    setOutcome({ error: 'boom' });
    await expect(
      transcodeIncomingMedia(
        'audio',
        '/tmp/in.webm',
        'voice.webm',
        'audio/webm;codecs=opus',
      ),
    ).rejects.toThrow(/Audio transcode failed/);
  });

  it('rejects an audio upload that exceeds the 90s voice-note cap', async () => {
    setDuration(120);
    await expect(
      transcodeIncomingMedia(
        'audio',
        '/tmp/in.webm',
        'voice.webm',
        'audio/webm;codecs=opus',
      ),
    ).rejects.toThrow(/exceeds the 90s/);
    // The cap is checked before any transcode work is done.
    expect(ffmpegMock).not.toHaveBeenCalled();
  });

  it('accepts an audio upload exactly at the cap (boundary)', async () => {
    setDuration(90);
    const result = await transcodeIncomingMedia(
      'audio',
      '/tmp/in.m4a',
      'voice.m4a',
      'audio/mp4',
    );
    expect(result.path).toBe('/tmp/in.m4a');
  });

  it('fails closed when the audio duration cannot be probed', async () => {
    setDuration(null);
    // `MediaContentError` specifically: the sync upload handler maps it to a
    // 400, while a generic `Error` would escape as a 500.
    await expect(
      transcodeIncomingMedia(
        'audio',
        '/tmp/in.webm',
        'voice.webm',
        'audio/webm;codecs=opus',
      ),
    ).rejects.toThrow(MediaContentError);
    await expect(
      transcodeIncomingMedia(
        'audio',
        '/tmp/in.webm',
        'voice.webm',
        'audio/webm;codecs=opus',
      ),
    ).rejects.toThrow(/Could not probe audio duration/);
  });
});
