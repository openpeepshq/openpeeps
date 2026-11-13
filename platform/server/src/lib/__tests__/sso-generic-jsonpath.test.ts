import { describe, expect, it } from 'vitest';
import jp from 'jsonpath';
import { interpolate } from '@openpeepshq/common/lib';

describe('jsonpath SSO extraction regression', () => {
  // Regression test for jsonpath 1.1.1 → 1.3.0 bump (#2068).
  // These shapes exercise the same patterns the generic SSO handler
  // uses via `jp.value(profile, interpolate(path, params))` when
  // building a UserProfileData (email, handle, avatar, displayName).

  const profile: Record<string, unknown> = {
    id: 'prov-42',
    email: 'alice@example.com',
    name: 'Alice Smith',
    pictures: {
      large: 'https://cdn.example.com/alice.png',
    },
    preferred_username: 'alice',
    groups: ['users', 'admins'],
  };

  describe('jp.value / jp.query stability across jsonpath versions', () => {
    it('extracts a top-level scalar field', () => {
      expect(jp.value(profile, '$.email')).toBe('alice@example.com');
      expect(jp.value(profile, '$.name')).toBe('Alice Smith');
    });

    it('extracts a nested scalar field', () => {
      expect(jp.value(profile, '$.pictures.large')).toBe(
        'https://cdn.example.com/alice.png',
      );
    });

    it('extracts an array-indexed element', () => {
      expect(jp.value(profile, '$.groups[0]')).toBe('users');
      expect(jp.value(profile, '$.groups[1]')).toBe('admins');
    });

    it('returns undefined for a missing path without throwing', () => {
      expect(jp.value(profile, '$.phone')).toBeUndefined();
      expect(jp.value(profile, '$.address.city')).toBeUndefined();
      expect(jp.value(profile, '$.nonexistent.deep.path')).toBeUndefined();
    });

    it('returns undefined when a middle node is missing', () => {
      // profile has no `address` key — accessing a child of a missing node
      // should short-circuit to undefined rather than error.
      expect(jp.value(profile, '$.address[0].street')).toBeUndefined();
    });

    it('resolves interpolated expressions from params', () => {
      // Raw string with ${...} placeholders (not JS template literal),
      // so interpolate() actually performs the substitution.
      expect(
        jp.value(profile, interpolate('$.pictures[${key}]', { key: 'large' })),
      ).toBe('https://cdn.example.com/alice.png');
    });

    it('query() returns an array of matches', () => {
      const matches = jp.query(profile, '$.groups[*]');
      expect(matches).toEqual(['users', 'admins']);
    });

    it('query() returns empty array for no match', () => {
      const matches = jp.query(profile, '$.phone');
      expect(matches).toEqual([]);
    });
  });

  describe('unsafe key handling (jsonpath 1.3.0)', () => {
    it('throws on __proto__ key in path', () => {
      const obj = { __proto__: { secret: 'yes' }, normal: 'val' };
      expect(() => jp.value(obj, '$.__proto__.secret')).toThrow(
        'Unsafe key',
      );
    });

    it('throws on prototype key in path', () => {
      const obj = { prototype: { val: 1 } };
      expect(() => jp.value(obj, '$.prototype.val')).toThrow(
        'Unsafe key',
      );
    });

    it('throws on constructor key in path', () => {
      const obj = { constructor: { val: 2 } };
      expect(() => jp.value(obj, '$.constructor.val')).toThrow(
        'Unsafe key',
      );
    });
  });

  describe('interpolate unsafe-key rejection', () => {
    it('rejects __proto__ as a param value', () => {
      expect(() =>
        interpolate('$.user[$[0]]', { id: '__proto__' }),
      ).toThrow(/unsafe key/i);
    });

    it('rejects prototype as a param value', () => {
      expect(() =>
        interpolate('$.user[$[0]]', { id: 'prototype' }),
      ).toThrow(/unsafe key/i);
    });

    it('rejects constructor as a param value', () => {
      expect(() =>
        interpolate('$.user[$[0]]', { id: 'constructor' }),
      ).toThrow(/unsafe key/i);
    });

    it('allows normal param values through', () => {
      expect(
        interpolate('$.user[$[0]]', { id: 'alice' }),
      ).toBe('$.user[alice]');
    });
  });
});
