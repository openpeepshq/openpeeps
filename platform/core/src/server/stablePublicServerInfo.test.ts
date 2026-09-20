import { describe, expect, it } from 'vitest';
import {
  createStableLoader,
  roundDownUptimeSeconds,
  serverInfoBucketStart,
} from './stablePublicServerInfo';

describe('serverInfoBucketStart', () => {
  it('rounds down to the last 10-minute wall-clock mark', () => {
    expect(serverInfoBucketStart(1_800_000)).toBe(1_800_000);
    expect(serverInfoBucketStart(1_800_001)).toBe(1_800_000);
    expect(serverInfoBucketStart(2_399_999)).toBe(1_800_000);
    expect(serverInfoBucketStart(2_400_000)).toBe(2_400_000);
  });
});

describe('roundDownUptimeSeconds', () => {
  it('rounds uptime down to 10-minute steps', () => {
    expect(roundDownUptimeSeconds(0)).toBe(0);
    expect(roundDownUptimeSeconds(599)).toBe(0);
    expect(roundDownUptimeSeconds(600)).toBe(600);
    expect(roundDownUptimeSeconds(1_199)).toBe(600);
    expect(roundDownUptimeSeconds(1_200)).toBe(1_200);
  });
});

describe('createStableLoader', () => {
  const tenMin = 10 * 60 * 1000;

  it('reuses the payload until the next 10-minute bucket', async () => {
    const loader = createStableLoader<number>(tenMin);
    let calls = 0;
    const load = async () => {
      calls += 1;
      return calls;
    };

    expect(await loader.get(load, 0)).toBe(1);
    expect(await loader.get(load, tenMin - 1)).toBe(1);
    expect(calls).toBe(1);
  });

  it('recomputes at the next 10-minute bucket', async () => {
    const loader = createStableLoader<number>(tenMin);
    let calls = 0;
    const load = async () => {
      calls += 1;
      return calls;
    };

    expect(await loader.get(load, 0)).toBe(1);
    expect(await loader.get(load, tenMin)).toBe(2);
    expect(calls).toBe(2);
  });

  it('reloads after reset in the same bucket', async () => {
    const loader = createStableLoader<number>(tenMin);
    let calls = 0;
    const load = async () => {
      calls += 1;
      return calls;
    };

    expect(await loader.get(load, 0)).toBe(1);
    loader.reset();
    expect(await loader.get(load, 0)).toBe(2);
    expect(calls).toBe(2);
  });

  it('coalesces concurrent misses into one load', async () => {
    const loader = createStableLoader<number>(tenMin);
    let calls = 0;
    let release: (value: number) => void = () => undefined;
    const load = () => {
      calls += 1;
      return new Promise<number>((resolve) => {
        release = resolve;
      });
    };

    const first = loader.get(load, 0);
    const second = loader.get(load, 0);
    release(7);
    expect(await Promise.all([first, second])).toEqual([7, 7]);
    expect(calls).toBe(1);
  });
});
