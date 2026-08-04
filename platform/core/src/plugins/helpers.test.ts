import { describe, expect, it } from 'vitest';
import { sortByDependencies } from './helpers';
import type { PackageJson } from 'type-fest';

const pkg = (deps?: Record<string, string>, name?: string): PackageJson => ({
  name,
  dependencies: deps,
});

describe('sortByDependencies', () => {
  it('keeps independent plugins in input order', () => {
    const input: [string, PackageJson][] = [
      ['a/one', pkg()],
      ['b/two', pkg()],
    ];
    expect(sortByDependencies(input)).toEqual(input);
  });

  it('orders dependencies before dependents', () => {
    const input: [string, PackageJson][] = [
      ['b/dependent', pkg({ 'a/base': 'workspace:^' })],
      ['a/base', pkg()],
    ];
    const sorted = sortByDependencies(input);
    expect(sorted.map(([key]) => key)).toEqual(['a/base', 'b/dependent']);
  });

  it('ignores dependencies on plugins outside the set', () => {
    const input: [string, PackageJson][] = [
      ['a/one', pkg({ external: '^1.0.0' })],
      ['b/two', pkg()],
    ];
    expect(sortByDependencies(input)).toEqual(input);
  });

  it('stops when a cycle is detected', () => {
    const input: [string, PackageJson][] = [
      ['a/one', pkg({ 'b/two': 'workspace:^' })],
      ['b/two', pkg({ 'a/one': 'workspace:^' })],
    ];
    const sorted = sortByDependencies(input);
    expect(sorted.length).toBeLessThan(input.length);
  });

  it('resolves scoped package names to directory keys', () => {
    const input: [string, PackageJson][] = [
      [
        'openpeeps/dependent',
        pkg({ '@openpeeps-plugins/greeting': 'workspace:^' }),
      ],
      ['openpeeps/greeting', pkg(undefined, '@openpeeps-plugins/greeting')],
    ];
    const sorted = sortByDependencies(input);
    expect(sorted.map(([key]) => key)).toEqual([
      'openpeeps/greeting',
      'openpeeps/dependent',
    ]);
  });
});
