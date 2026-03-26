import { describe, it, expect } from 'vitest';
import {
  pick,
  transformKeys,
  transformValues,
  lowerCaseFirst,
  asyncFilter,
  passThroughUndefined,
  countBy,
  groupBy,
  dateSorter,
  getUniqueBy,
  interpolate,
  sleep,
  deepSet,
  deepGet,
  hasValue,
  kebabToCamelCase,
  formatTimeStamp,
  getTheme,
  getProfileAvatar,
  getGroupAvatar,
} from '../utils';
import type {
  CommunityConfig,
  PublicProfile,
  GroupWithMeta,
} from '../../types';

// Mock types for testing
const mockConfig: CommunityConfig = {
  theme: {
    base: 'OpenpeepsDark',
    dark: {
      defaultProfileAvatar: 'dark-avatar.png',
      defaultGroupAvatar: 'dark-group.png',
    },
    light: {
      defaultProfileAvatar: 'light-avatar.png',
      defaultGroupAvatar: 'light-group.png',
    },
  },
} as CommunityConfig;

const mockProfile: PublicProfile = {
  avatar: 'user-avatar.png',
} as PublicProfile;

const mockGroup: GroupWithMeta = {
  avatar: 'group-avatar.png',
} as GroupWithMeta;

describe('utils', () => {
  describe('pick', () => {
    it('should pick specified keys from object', () => {
      const obj = { a: 1, b: 2, c: 3 };
      const result = pick(obj, 'a', 'c');
      expect(result).toEqual({ a: 1, c: 3 });
    });

    it('should work with empty keys array', () => {
      const obj = { a: 1, b: 2, c: 3 };
      const result = pick(obj);
      expect(result).toEqual({});
    });
  });

  describe('transformKeys', () => {
    it('should transform object keys', () => {
      const obj = { 'key-one': 1, 'key-two': 2 };
      const result = transformKeys(obj, (key) => key.replace('-', '_'));
      expect(result).toEqual({ key_one: 1, key_two: 2 });
    });

    it('should work with empty object', () => {
      const result = transformKeys({}, (key) => key.toUpperCase());
      expect(result).toEqual({});
    });
  });

  describe('transformValues', () => {
    it('should transform object values', () => {
      const obj = { a: 1, b: 2, c: 3 };
      const result = transformValues(obj, (val) => val * 2);
      expect(result).toEqual({ a: 2, b: 4, c: 6 });
    });

    it('should work with empty object', () => {
      const result = transformValues({}, (val) => val);
      expect(result).toEqual({});
    });
  });

  describe('lowerCaseFirst', () => {
    it('should lowercase first character', () => {
      expect(lowerCaseFirst('Hello')).toBe('hello');
      expect(lowerCaseFirst('WORLD')).toBe('wORLD');
      expect(lowerCaseFirst('a')).toBe('a');
    });

    it('should handle empty string', () => {
      expect(lowerCaseFirst('')).toBe('');
    });
  });

  describe('asyncFilter', () => {
    it('should filter array asynchronously', async () => {
      const arr = [1, 2, 3, 4, 5];
      const predicate = async (n: number) => n % 2 === 0;
      const result = await asyncFilter(arr, predicate);
      expect(result).toEqual([2, 4]);
    });

    it('should work with empty array', async () => {
      const result = await asyncFilter([], async () => true);
      expect(result).toEqual([]);
    });
  });

  describe('passThroughUndefined', () => {
    it('should apply function when input is defined', () => {
      const fn = (x: number) => x * 2;
      const wrapped = passThroughUndefined(fn);
      expect(wrapped(5)).toBe(10);
    });

    it('should return undefined when input is undefined', () => {
      const fn = (x: number) => x * 2;
      const wrapped = passThroughUndefined(fn);
      expect(wrapped(undefined)).toBeUndefined();
    });
  });

  describe('countBy', () => {
    it('should count elements by key function', () => {
      const arr = ['apple', 'banana', 'apple', 'cherry', 'banana', 'apple'];
      const result = countBy(arr, (item) => item);
      expect(result).toEqual({ apple: 3, banana: 2, cherry: 1 });
    });

    it('should work with empty array', () => {
      const result = countBy([], (item) => item);
      expect(result).toEqual({});
    });
  });

  describe('groupBy', () => {
    it('should group elements by key function', () => {
      const arr = [
        { type: 'fruit', name: 'apple' },
        { type: 'vegetable', name: 'carrot' },
        { type: 'fruit', name: 'banana' },
      ];
      const result = groupBy(arr, (item) => item.type);
      expect(result).toEqual({
        fruit: [
          { type: 'fruit', name: 'apple' },
          { type: 'fruit', name: 'banana' },
        ],
        vegetable: [{ type: 'vegetable', name: 'carrot' }],
      });
    });

    it('should work with empty array', () => {
      const result = groupBy([], (item) => item);
      expect(result).toEqual({});
    });
  });

  describe('dateSorter', () => {
    it('should sort by date ascending', () => {
      const items = [
        { createdAt: '2023-01-02' },
        { createdAt: '2023-01-01' },
        { createdAt: '2023-01-03' },
      ];
      const sorter = dateSorter();
      const sorted = items.sort(sorter);
      expect(sorted[0].createdAt).toBe('2023-01-01');
      expect(sorted[2].createdAt).toBe('2023-01-03');
    });

  });

  describe('getUniqueBy', () => {
    it('should return unique elements by predicate', () => {
      const arr = [
        { id: 1, name: 'a' },
        { id: 2, name: 'b' },
        { id: 1, name: 'c' },
      ];
      const result = getUniqueBy(arr, (item) => item.id);
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(1);
      expect(result[1].id).toBe(2);
    });

    it('should work with empty array', () => {
      const result = getUniqueBy([], (item) => item);
      expect(result).toEqual([]);
    });
  });

  describe('interpolate', () => {
    it('should interpolate template string', () => {
      const template = 'Hello ${name}, you have ${count} messages';
      const params = { name: 'John', count: '5' };
      const result = interpolate(template, params);
      expect(result).toBe('Hello John, you have 5 messages');
    });

    it('should return undefined for undefined input', () => {
      const result = interpolate(undefined);
      expect(result).toBeUndefined();
    });

    it('should work with empty params', () => {
      const template = 'Hello world';
      const result = interpolate(template, {});
      expect(result).toBe('Hello world');
    });

    it('should throw error for invalid template', () => {
      const template = 'Hello ${invalid syntax';
      const params = { name: 'John' };
      expect(() => interpolate(template, params)).toThrow();
    });
  });

  describe('sleep', () => {
    it('should sleep for specified seconds', async () => {
      const start = Date.now();
      await sleep(0.1); // 100ms
      const end = Date.now();
      expect(end - start).toBeGreaterThanOrEqual(90); // Allow some tolerance
    });
  });

  describe('deepSet', () => {
    it('should set nested property with string path', () => {
      const obj = { a: { b: { c: 1 } } };
      const result = deepSet(obj, 'a.b.c', 42);
      expect(result.a.b.c).toBe(42);
    });

    it('should set nested property with array path', () => {
      const obj = { a: { b: { c: 1 } } };
      const result = deepSet(obj, ['a', 'b', 'c'], 42);
      expect(result.a.b.c).toBe(42);
    });

    it('should create nested objects as needed', () => {
      const obj = {};
      const result = deepSet(obj, 'a.b.c', 42) as { a: { b: { c: number } } };
      expect(result.a.b.c).toBe(42);
    });

    it('should handle array indices', () => {
      const obj = { items: [] };
      const result = deepSet(obj, 'items[0]', 'first');
      expect(result.items[0]).toBe('first');
    });
  });

  describe('deepGet', () => {
    it('should get nested property', () => {
      const obj = { a: { b: { c: 42 } } };
      const result = deepGet(obj, ['a', 'b', 'c']);
      expect(result).toBe(42);
    });

    it('should return undefined for non-existent path', () => {
      const obj = { a: { b: { c: 42 } } };
      const result = deepGet(obj, ['a', 'b', 'd']);
      expect(result).toBeUndefined();
    });
  });

  describe('hasValue', () => {
    it('should return true for valid values', () => {
      expect(hasValue(1)).toBe(true);
      expect(hasValue(0)).toBe(true); // Special case: 0 is valid
      expect(hasValue('hello')).toBe(true);
      expect(hasValue(true)).toBe(true);
      expect(hasValue([])).toBe(true);
      expect(hasValue({})).toBe(true);
    });

    it('should return false for invalid values', () => {
      expect(hasValue(null)).toBe(false);
      expect(hasValue(undefined)).toBe(false);
      expect(hasValue('')).toBe(false);
      expect(hasValue(false)).toBe(false);
    });
  });

  describe('kebabToCamelCase', () => {
    it('should convert kebab-case to camelCase', () => {
      expect(kebabToCamelCase('hello-world')).toBe('helloWorld');
      expect(kebabToCamelCase('my-very-long-variable-name')).toBe(
        'myVeryLongVariableName',
      );
      expect(kebabToCamelCase('single')).toBe('single');
    });

    it('should handle empty string', () => {
      expect(kebabToCamelCase('')).toBe('');
    });
  });

  describe('formatTimeStamp', () => {
    it('should format timestamp to date string', () => {
      const timestamp = 1640995200; // 2022-01-01
      const result = formatTimeStamp(timestamp);
      expect(result).toBe('1/1/2022');
    });

    it('should return N/A for null timestamp', () => {
      const result = formatTimeStamp(null);
      expect(result).toBe('N/A');
    });

    it('should calculate next month when startDate provided and timestamp is null', () => {
      const startDate = 1640995200; // 2022-01-01
      const result = formatTimeStamp(null, startDate);
      expect(result).toBe('2/1/2022');
    });
  });

  describe('getTheme', () => {
    it('should return dark theme for OpenpeepsDark base', () => {
      const result = getTheme(mockConfig);
      expect(result).toBe(mockConfig.theme.dark);
    });

    it('should return light theme for non-OpenpeepsDark base', () => {
      const lightConfig = {
        ...mockConfig,
        theme: { ...mockConfig.theme, base: 'Light' },
      };
      const result = getTheme(lightConfig);
      expect(result).toBe(lightConfig.theme.light);
    });
  });

  describe('getProfileAvatar', () => {
    it('should return profile avatar when available', () => {
      const result = getProfileAvatar(mockProfile, mockConfig);
      expect(result).toBe('user-avatar.png');
    });

    it('should return default avatar when profile has no avatar', () => {
      const profileWithoutAvatar = { ...mockProfile, avatar: undefined };
      const result = getProfileAvatar(profileWithoutAvatar, mockConfig);
      expect(result).toBe('dark-avatar.png');
    });

    it('should return default avatar when profile is null', () => {
      const result = getProfileAvatar(null, mockConfig);
      expect(result).toBe('dark-avatar.png');
    });
  });

  describe('getGroupAvatar', () => {
    it('should return group avatar when available', () => {
      const result = getGroupAvatar(mockGroup, mockConfig);
      expect(result).toBe('group-avatar.png');
    });

    it('should return default avatar when group has no avatar', () => {
      const groupWithoutAvatar = { ...mockGroup, avatar: undefined };
      const result = getGroupAvatar(groupWithoutAvatar, mockConfig);
      expect(result).toBe('dark-group.png');
    });

    it('should return default avatar when group is null', () => {
      const result = getGroupAvatar(null, mockConfig);
      expect(result).toBe('dark-group.png');
    });
  });
});
