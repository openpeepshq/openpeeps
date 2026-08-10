import { blurProcessor, transformStream } from '@openpeepshq/greenscreen';
import type { Track, TrackProcessor } from 'livekit-client';

/**
 * LiveKit video track processor that applies the `@openpeepshq/greenscreen`
 * background blur, mirroring the Svelte `blurProcessor` pipeline. Used both for
 * the lobby preview track and the published in-room camera track via
 * `LocalVideoTrack.setProcessor` / `stopProcessor`.
 */
export function createBlurProcessor(
  radius = 12,
): TrackProcessor<Track.Kind.Video> {
  let output: MediaStream | undefined;

  const processor: TrackProcessor<Track.Kind.Video> = {
    name: 'greenscreen-blur',
    async init(opts) {
      const input = new MediaStream([opts.track]);
      output = await transformStream(input, blurProcessor(radius));
      processor.processedTrack = output.getVideoTracks()[0];
    },
    async restart(opts) {
      await processor.destroy();
      await processor.init(opts);
    },
    async destroy() {
      output?.getTracks().forEach((track) => track.stop());
      output = undefined;
      processor.processedTrack = undefined;
    },
  };

  return processor;
}
