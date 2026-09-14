import { describe, expect, it } from 'vitest';
import {
  diskUsage,
  profileLimit,
  resourceSnapshot,
  trimToNull,
} from './status';

describe('trimToNull', () => {
  it('returns null for empty values', () => {
    expect(trimToNull(undefined)).toBeNull();
    expect(trimToNull('')).toBeNull();
    expect(trimToNull('   ')).toBeNull();
  });

  it('trims non-empty values', () => {
    expect(trimToNull('  abc  ')).toBe('abc');
  });
});

describe('profileLimit', () => {
  it('treats missing and zero as unlimited', () => {
    expect(profileLimit(undefined)).toBeNull();
    expect(profileLimit(0)).toBeNull();
  });

  it('keeps a positive cap', () => {
    expect(profileLimit(100)).toBe(100);
  });
});

describe('resourceSnapshot', () => {
  it('reports process and system memory', () => {
    const snap = resourceSnapshot();
    expect(snap.processMemory.rssBytes).toBeGreaterThan(0);
    expect(snap.processMemory.heapUsedBytes).toBeGreaterThan(0);
    expect(snap.systemMemory.totalBytes).toBeGreaterThan(0);
    expect(snap.systemMemory.freeBytes).toBeGreaterThanOrEqual(0);
    expect(snap.loadAverage).toHaveLength(3);
  });
});

describe('diskUsage', () => {
  it('returns null when the path cannot be read', async () => {
    expect(await diskUsage('/this/path/does/not/exist-openpeeps')).toBeNull();
  });
});
