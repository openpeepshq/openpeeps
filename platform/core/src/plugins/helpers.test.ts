import { describe, expect, it } from 'vitest';
import { sortByDependencies } from './helpers';
import type { PackageJson } from 'type-fest';

const pkg = (deps?: Record<string, string>, name?: string): PackageJson => ({
  name,
  dependencies: deps,
});

describe('sortByDependencies', () => {
  it('keeps independent plugins in input order', () => {
    const input: [string, PackageJson, string][] = [
      ['a/one', pkg(), 'a/one'],
      ['b/two', pkg(), 'b/two'],
    ];
    expect(sortByDependencies(input)).toEqual(input);
  });

  it('orders dependencies before dependents', () => {
    const input: [string, PackageJson, string][] = [
      ['b/dependent', pkg({ 'a/base': 'workspace:^' }), 'b/dependent'],
      ['a/base', pkg(), 'a/base'],
    ];
    const sorted = sortByDependencies(input);
    expect(sorted.map(([key]) => key)).toEqual(['a/base', 'b/dependent']);
  });

  it('ignores dependencies on plugins outside the set', () => {
    const input: [string, PackageJson, string][] = [
      ['a/one', pkg({ external: '^1.0.0' }), 'a/one'],
      ['b/two', pkg(), 'b/two'],
    ];
    expect(sortByDependencies(input)).toEqual(input);
  });

  it('stops when a cycle is detected', () => {
    const input: [string, PackageJson, string][] = [
      ['a/one', pkg({ 'b/two': 'workspace:^' }), 'a/one'],
      ['b/two', pkg({ 'a/one': 'workspace:^' }), 'b/two'],
    ];
    const sorted = sortByDependencies(input);
    expect(sorted.length).toBeLessThan(input.length);
  });

  it('resolves scoped package names to directory keys', () => {
    const input: [string, PackageJson, string][] = [
      [
        'openpeeps/dependent',
        pkg({ '@openpeepshq-plugins/greeting': 'workspace:^' }),
        'openpeeps/dependent',
      ],
      [
        'openpeeps/greeting',
        pkg(undefined, '@openpeepshq-plugins/greeting'),
        'openpeeps/greeting',
      ],
    ];
    const sorted = sortByDependencies(input);
    expect(sorted.map(([key]) => key)).toEqual([
      'openpeeps/greeting',
      'openpeeps/dependent',
    ]);
  });
});
