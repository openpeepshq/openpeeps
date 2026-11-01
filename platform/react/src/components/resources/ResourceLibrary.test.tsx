/** @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';
import {
  filtersFromUrl,
  filtersToUrl,
  type ResourceLibraryFilters,
} from './resourceLibraryFilters';

const roundTrip = (f: ResourceLibraryFilters) =>
  filtersFromUrl(filtersToUrl(new URLSearchParams(), f));

describe('resource library URL filters', () => {
  it('serializes active filters into query params', () => {
    const params = filtersToUrl(new URLSearchParams(), {
      kind: 'file',
      saved: true,
      tags: ['a', 'b'],
      path: ['Design', 'Icons'],
    });
    expect(params.get('kind')).toBe('file');
    expect(params.get('saved')).toBe('1');
    expect(params.get('tags')).toBe('a,b');
    expect(params.get('path')).toBe('Design/Icons');
  });

  it('omits defaults so the URL stays clean', () => {
    const params = filtersToUrl(new URLSearchParams(), {
      kind: 'all',
      saved: false,
      tags: [],
      path: [],
    });
    expect(params.toString()).toBe('');
  });

  it('round-trips a shared filter set', () => {
    expect(
      roundTrip({ kind: 'video', saved: false, tags: ['x'], path: ['a'] }),
    ).toEqual({ kind: 'video', saved: false, tags: ['x'], path: ['a'] });
  });

  it('round-trips a clean (no-filter) URL to defaults', () => {
    expect(
      roundTrip({ kind: 'all', saved: false, tags: [], path: [] }),
    ).toEqual({
      kind: undefined,
      saved: false,
      tags: undefined,
      path: undefined,
    });
  });

  it('ignores an invalid kind from a hand-edited URL', () => {
    const params = new URLSearchParams('kind=not-a-kind&tags=b');
    expect(filtersFromUrl(params).kind).toBeUndefined();
    expect(filtersFromUrl(params).tags).toEqual(['b']);
  });

  it('preserves unrelated query params when writing', () => {
    const base = new URLSearchParams('toast=hi');
    const params = filtersToUrl(base, {
      kind: 'audio',
      saved: false,
      tags: [],
      path: [],
    });
    expect(params.get('toast')).toBe('hi');
    expect(params.get('kind')).toBe('audio');
  });
});
