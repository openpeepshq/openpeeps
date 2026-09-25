import { describe, expect, it } from 'vitest';
import {
  flushDeferredPageReload,
  isJamRoomPath,
  requestPageReload,
} from '../pageReload';

describe('isJamRoomPath', () => {
  it('matches the jam room route', () => {
    expect(isJamRoomPath('/events/abc/jam')).toBe(true);
    expect(isJamRoomPath('/events/abc/jam/')).toBe(true);
    expect(isJamRoomPath('/events/abc')).toBe(false);
    expect(isJamRoomPath('/jams')).toBe(false);
  });
});

describe('requestPageReload', () => {
  it('reloads outside a jam', () => {
    let reloads = 0;
    expect(requestPageReload(() => {
      reloads += 1;
    }, () => false)).toBe(true);
    expect(reloads).toBe(1);
    expect(flushDeferredPageReload(() => {
      reloads += 1;
    }, () => false)).toBe(false);
  });

  it('defers a reload until the jam route is left', () => {
    let reloads = 0;
    const reload = () => {
      reloads += 1;
    };
    expect(requestPageReload(reload, () => true)).toBe(false);
    expect(reloads).toBe(0);
    expect(flushDeferredPageReload(reload, () => true)).toBe(false);
    expect(flushDeferredPageReload(reload, () => false)).toBe(true);
    expect(reloads).toBe(1);
  });
});
