import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** shadcn-standard className merger. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export const deepGet = (obj: unknown, path: (string | number | symbol)[]): unknown =>
  path.reduce<unknown>(
    (o, key) =>
      o && typeof o === 'object'
        ? (o as Record<string | number | symbol, unknown>)[key]
        : undefined,
    obj,
  );

/**
 * Mutates `obj` by setting `path` to `val`. Mirrors @openpeepshq/ui's deepSet
 * so we keep the same call sites in form helpers.
 */
export const deepSet = <T>(obj: T, path: string | (string | number)[], val: unknown): T => {
  const keys = Array.isArray(path)
    ? path
    : path
        .replace(/(\w)\[/g, '$1.[')
        .split('.')
        .map((k) => (k.includes('[') ? parseInt(k.substring(1, k.length - 1), 10) : k));

  let sub: unknown = obj;
  for (let i = 0; i < keys.length; i++) {
    const currentKey = keys[i] as keyof typeof sub;
    const nextKey = keys[i + 1];
    const cursor = sub as Record<string | number, unknown>;

    if (typeof nextKey !== 'undefined') {
      cursor[currentKey as string | number] =
        cursor[currentKey as string | number] ??
        (typeof nextKey === 'number' || /^\d+$/.test(String(nextKey)) ? [] : {});
    } else {
      cursor[currentKey as string | number] = val;
    }
    sub = cursor[currentKey as string | number];
  }
  return obj;
};

export const getUniqueBy = <T, V = string>(arr: T[], predicate: (o: T) => V): T[] => {
  const set = new Set<V>();
  return arr.filter((o) => {
    const key = predicate(o);
    if (set.has(key)) return false;
    set.add(key);
    return true;
  });
};
