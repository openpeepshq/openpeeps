import { describe, expect, it } from 'vitest';
import { formatBytes, formatUptime, usagePercent } from './serverStatusFormat';

describe('formatBytes', () => {
  it('formats whole and fractional units', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(2048)).toBe('2 KB');
    expect(formatBytes(1536)).toBe('1.5 KB');
    expect(formatBytes(1024 * 1024 * 3)).toBe('3 MB');
  });
});

describe('formatUptime', () => {
  it('includes days when present', () => {
    expect(formatUptime(90)).toBe('1m');
    expect(formatUptime(3_600 + 120)).toBe('1h 2m');
    expect(formatUptime(86_400 * 2 + 3_600 * 4 + 60 * 5)).toBe('2d 4h 5m');
  });
});

describe('usagePercent', () => {
  it('clamps to 0–100', () => {
    expect(usagePercent(50, 100)).toBe(50);
    expect(usagePercent(0, 0)).toBe(0);
    expect(usagePercent(200, 100)).toBe(100);
  });
});
