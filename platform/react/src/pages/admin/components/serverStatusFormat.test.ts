import { describe, expect, it } from 'vitest';
import { formatBytes, formatUptime, usagePercent } from './serverStatusFormat';

describe('serverStatusFormat', () => {
  it('formats bytes', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(1024)).toBe('1 KB');
    expect(formatBytes(1536)).toBe('1.5 KB');
  });

  it('formats uptime', () => {
    expect(formatUptime(45)).toBe('0m');
    expect(formatUptime(90)).toBe('1m');
    expect(formatUptime(3_600)).toBe('1h 0m');
    expect(formatUptime(90_000)).toBe('1d 1h 0m');
  });

  it('computes usage percent', () => {
    expect(usagePercent(25, 100)).toBe(25);
    expect(usagePercent(0, 0)).toBe(0);
    expect(usagePercent(200, 100)).toBe(100);
  });
});
