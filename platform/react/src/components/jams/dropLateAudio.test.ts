import { describe, expect, it } from 'vitest';
import {
  audioClockPerMs,
  installLateAudioDrop,
  isLateAudioFrame,
} from './dropLateAudio';

describe('audioClockPerMs', () => {
  it('uses the median 20ms frame gap', () => {
    expect(audioClockPerMs([960, 960, 960])).toBe(48);
  });

  it('waits for three gaps', () => {
    expect(audioClockPerMs([960, 960])).toBeUndefined();
  });
});

describe('isLateAudioFrame', () => {
  it('flags audio more than 200ms behind the receiver clock', () => {
    expect(isLateAudioFrame(7680, 38400, 48)).toBe(true);
    expect(isLateAudioFrame(38400, 39360, 48)).toBe(false);
  });
});

describe('installLateAudioDrop', () => {
  it('forwards live frames and skips a frame that shows up already late', async () => {
    const timestamps = [
      0, 960, 1920, 2880, 3840, 4800, 5760, 6720, 7680, 39360,
    ];
    const walls = [0, 20, 40, 60, 80, 100, 120, 140, 800, 820];
    let call = 0;
    const written: number[] = [];
    const receiver = {
      createEncodedStreams: () => ({
        readable: new ReadableStream<{ timestamp: number }>({
          start: (controller) => {
            for (const timestamp of timestamps)
              controller.enqueue({ timestamp });
            controller.close();
          },
        }),
        writable: new WritableStream<{ timestamp: number }>({
          write: (frame) => {
            written.push(frame.timestamp);
          },
        }),
      }),
    };

    await installLateAudioDrop(receiver, () => walls[call++] ?? 820);

    expect(written).toEqual([
      0, 960, 1920, 2880, 3840, 4800, 5760, 6720, 39360,
    ]);
  });

  it('leaves the receiver alone when encoded streams are unavailable', () => {
    expect(installLateAudioDrop({})).toBeUndefined();
  });
});
