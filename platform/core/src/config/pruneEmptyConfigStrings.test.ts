import { describe, expect, it } from 'vitest';
import { pruneEmptyConfigStrings } from './pruneEmptyConfigStrings';

describe('pruneEmptyConfigStrings', () => {
  it('removes nested empty-string keys', () => {
    expect(
      pruneEmptyConfigStrings({
        info: { name: 'Acme', tagLine: '', description: 'keep' },
        emptySibling: '',
      }),
    ).toEqual({
      info: { name: 'Acme', description: 'keep' },
    });
  });

  it('keeps false, 0, null, and non-empty strings', () => {
    expect(
      pruneEmptyConfigStrings({
        enabled: false,
        count: 0,
        maybe: null,
        label: 'ok',
      }),
    ).toEqual({
      enabled: false,
      count: 0,
      maybe: null,
      label: 'ok',
    });
  });

  it('drops empty objects left after pruning children', () => {
    expect(
      pruneEmptyConfigStrings({
        info: { tagLine: '' },
        keep: { value: 1 },
      }),
    ).toEqual({ keep: { value: 1 } });
  });

  it('leaves arrays intact but prunes objects inside them', () => {
    expect(
      pruneEmptyConfigStrings({
        items: ['', { a: '', b: 'x' }, { c: '' }],
      }),
    ).toEqual({
      items: ['', { b: 'x' }, {}],
    });
  });

  it('returns non-objects unchanged', () => {
    expect(pruneEmptyConfigStrings('')).toBe('');
    expect(pruneEmptyConfigStrings(42)).toBe(42);
    expect(pruneEmptyConfigStrings(null)).toBeNull();
  });
});
