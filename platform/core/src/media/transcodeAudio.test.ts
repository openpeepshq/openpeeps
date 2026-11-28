import { afterEach, describe, expect, it, vi } from 'vitest';
import { MediaContentError, transcodeIncomingMedia } from './index';

/**
 * Mock the ffmpeg/ffprobe boundary (`./ffmpeg`) so the audio-branch decision
 * logic (which uploads transcode vs. pass through, the `.m4a` filename
 * derivation, the `audio/mp4` rewrite) is tested without a real ffmpeg
 * encoder. The `vi.mock` factory is hoisted, so the mock functions and their
 * mutable outcome must live inside `vi.hoisted`.
 */
const { runFfmpegMock, ffprobeMock, setOutcome, setDuration } = vi.hoisted(
  () => {
    let outcome: { kind: 'ok' } | { error: string } = { kind: 'ok' };
    let duration: number | null = 30;
    // `runFfmpeg` resolves on success and rejects on a conversion failure
    // (the old fluent-ffmpeg `error` event); the outcome controls which.
    const runFfmpegMock = vi.fn(async () => {
      if ('error' in outcome) throw new Error(outcome.error);
    });
    // `ffprobe` reports `metadata.format.duration`; `null` simulates an
    // un-probeable file so the fail-closed path is testable.
    const ffprobeMock = vi.fn(async () => ({
      format: { duration },
      streams: [],
    }));
    return {
      runFfmpegMock,
      ffprobeMock,
      setOutcome: (o: { kind: 'ok' } | { error: string }) => {
        outcome = o;
      },
      setDuration: (d: number | null) => {
        duration = d;
      },
    };
  },
);

vi.mock('./ffmpeg', () => ({
  runFfmpeg: runFfmpegMock,
  ffprobe: ffprobeMock,
}));

describe('transcodeIncomingMedia — audio normalization', () => {
  afterEach(() => {
    runFfmpegMock.mockClear();
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
    expect(runFfmpegMock).toHaveBeenCalled();
    // The ffmpeg invocation must be the audio path (drop video, AAC codec),
    // not the video path (h264/webp) — pin it on the explicit argv.
    const lastCall = runFfmpegMock.mock.calls.at(-1);
    const outputArgs = lastCall?.[2] as string[];
    expect(outputArgs).toContain('-vn');
    expect(outputArgs).toContain('aac');
    expect(outputArgs).not.toContain('libwebp');
    // Output is a fresh temp .m4a (not the input) declared as audio/mp4.
    expect(result.path).not.toBe('/tmp/in.webm');
    expect(result.path).toMatch(/\.m4a$/);
    expect(result.filename).toBe('voice.m4a');
    expect(result.mimetype).toBe('audio/mp4');
  });

  it('transcodes audio/ogg too (only mp4/aac pass through)', async () => {
    const result = await transcodeIncomingMedia(
      'audio',
      '/tmp/in.ogg',
      'note.ogg',
      'audio/ogg;codecs=opus',
    );
    expect(runFfmpegMock).toHaveBeenCalled();
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
    expect(runFfmpegMock).not.toHaveBeenCalled();
    expect(result.path).toBe('/tmp/in.m4a');
    expect(result.filename).toBe('voice.m4a');
    expect(result.mimetype).toBe('audio/mp4');
  });

  it('passes audio/aac through untouched', async () => {
    const result = await transcodeIncomingMedia(
      'audio',
      '/tmp/in.aac',
      'voice.aac',
      'audio/aac',
    );
    expect(runFfmpegMock).not.toHaveBeenCalled();
    expect(result.path).toBe('/tmp/in.aac');
    expect(result.filename).toBe('voice.aac');
    expect(result.mimetype).toBe('audio/aac');
  });

  it('transcodes audio/mpeg (MP3) — react-native-sound on iOS does not guarantee MP3 playback', async () => {
    const result = await transcodeIncomingMedia(
      'audio',
      '/tmp/in.mp3',
      'voice.mp3',
      'audio/mpeg',
    );
    expect(runFfmpegMock).toHaveBeenCalled();
    // MP3 is normalized to a fresh .m4a / audio/mp4 like the other
    // non-native containers, so a picked MP3 plays on the iOS client too.
    expect(result.path).not.toBe('/tmp/in.mp3');
    expect(result.path).toMatch(/\.m4a$/);
    expect(result.filename).toBe('voice.m4a');
    expect(result.mimetype).toBe('audio/mp4');
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
    expect(runFfmpegMock).not.toHaveBeenCalled();
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

  it('accepts a sub-second audio upload (falsy-check vs. `>` comparison)', async () => {
    // Round-17 item 3: 0.5 s is the smallest honest take a wall-clock tick
    // can produce. Pinning it exercises the `!duration` truthiness branch
    // (0.5 is truthy, so probing succeeds) against the `>` cap comparison at
    // the shortest real input, not only at the 90 s boundary.
    setDuration(0.5);
    const result = await transcodeIncomingMedia(
      'audio',
      '/tmp/in.m4a',
      'voice.m4a',
      'audio/mp4',
    );
    expect(result.path).toBe('/tmp/in.m4a');
    expect(runFfmpegMock).not.toHaveBeenCalled();
  });

  it('rejects a pass-through audio/mp4 over the cap (probe → cap → pass-through order)', async () => {
    // Round-17 item 5: a picked .m4a reported as audio/mp4 is stored as-is
    // without transcoding, but the ffprobe cap still applies to
    // pass-through formats — the probe runs before the pass-through branch.
    // This pins the order (probe → cap → pass-through) so a refactor cannot
    // silently move the cap behind the pass-through early-return.
    setDuration(91);
    await expect(
      transcodeIncomingMedia('audio', '/tmp/in.m4a', 'voice.m4a', 'audio/mp4'),
    ).rejects.toThrow(/exceeds the 90s/);
    // The probe ran (ffprobe called) and no transcode work was started.
    expect(ffprobeMock).toHaveBeenCalled();
    expect(runFfmpegMock).not.toHaveBeenCalled();
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
