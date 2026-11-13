import { describe, expect, it } from 'vitest';
import { deepEqual } from '../utils';

describe('deepEqual', () => {
  it('is true for identical primitives', () => {
    expect(deepEqual(42, 42)).toBe(true);
    expect(deepEqual('a', 'a')).toBe(true);
    expect(deepEqual(true, true)).toBe(true);
    expect(deepEqual(null, null)).toBe(true); // identity check
    expect(deepEqual(undefined, undefined)).toBe(true); // identity check
  });

  it('is true for identical empty objects', () => {
    expect(deepEqual({}, {})).toBe(true);
  });

  it('is true for objects with same keys/values', () => {
    expect(deepEqual({ a: 1, b: 'x' }, { a: 1, b: 'x' })).toBe(true);
  });

  it('is false for objects with different values', () => {
    expect(deepEqual({ a: 1 }, { a: 2 })).toBe(false);
  });

  it('is false for objects with different keys', () => {
    expect(deepEqual({ a: 1 }, { b: 1 })).toBe(false);
    expect(deepEqual({ a: 1, b: 2 }, { a: 1 })).toBe(false);
  });

  it('is false for key-order permutation of same content', () => {
    expect(deepEqual({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(true);
  });

  it('is true for identical nested objects', () => {
    expect(deepEqual({ a: { b: 1 } }, { a: { b: 1 } })).toBe(true);
  });

  it('is false for nested objects with different values', () => {
    expect(deepEqual({ a: { b: 1 } }, { a: { b: 2 } })).toBe(false);
  });

  it('is true for identical arrays', () => {
    expect(deepEqual([1, 2, 3], [1, 2, 3])).toBe(true);
  });

  it('is false for arrays with different content', () => {
    expect(deepEqual([1, 2], [1, 3])).toBe(false);
  });

  it('handles arrays of objects', () => {
    expect(deepEqual([{ a: 1 }, { b: 2 }], [{ a: 1 }, { b: 2 }])).toBe(true);
    expect(deepEqual([{ a: 1 }, { b: 2 }], [{ a: 1 }, { b: 3 }])).toBe(false);
  });

  it('returns true for identical null/undefined', () => {
    expect(deepEqual(null, null)).toBe(true);
    expect(deepEqual(undefined, undefined)).toBe(true);
  });

  it('returns false for null/undefined mismatches', () => {
    expect(deepEqual({ a: 1 }, undefined)).toBe(false);
    expect(deepEqual({ a: 1 }, null)).toBe(false);
    expect(deepEqual(null, undefined)).toBe(false);
  });

  it('returns false for type mismatch', () => {
    expect(deepEqual(1, '1')).toBe(false);
    expect(deepEqual([1], { 0: 1 })).toBe(false);
  });
});
