import { afterEach, describe, expect, it } from 'vitest';
import {
  clearSlowRequests,
  getSlowRequests,
  recordSlowRequest,
  truncateSql,
} from './index';

describe('performance helpers', () => {
  afterEach(() => {
    clearSlowRequests();
  });

  it('records slow requests in a ring buffer newest-first', () => {
    recordSlowRequest({
      method: 'GET',
      path: '/a',
      status: 200,
      durationMs: 1200,
      hostname: 'community.example.com',
    });
    recordSlowRequest({
      method: 'POST',
      path: '/b',
      status: 500,
      durationMs: 2000,
      hostname: 'community.example.com',
    });
    const rows = getSlowRequests();
    expect(rows).toHaveLength(2);
    expect(rows[0]?.path).toBe('/b');
    expect(rows[1]?.path).toBe('/a');
    expect(rows[0]?.hostname).toBe('community.example.com');
    expect(rows[0]?.at).toMatch(/^\d{4}-/);
  });

  it('truncates SQL for logs', () => {
    const long = `SELECT ${'x'.repeat(300)}`;
    expect(truncateSql(long).endsWith('…')).toBe(true);
    expect(truncateSql({ text: 'select 1' })).toBe('select 1');
  });
});
