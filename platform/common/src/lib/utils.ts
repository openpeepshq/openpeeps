import {
  AudienceSetting,
  CommunityConfig,
  GroupData,
  GroupWithMeta,
  ProfileSettings,
  PublicProfile,
} from '../types';
export const pick = <T, K extends keyof T>(
  obj: T,
  ...keys: K[]
): Pick<T, K> => {
  const ret = {} as Pick<T, K>;
  keys.forEach((key) => {
    ret[key] = obj[key];
  });
  return ret;
};

export const transformKeys = (
  object: Record<string, unknown>,
  transform: (name: string) => string,
) =>
  Object.fromEntries(
    [...Object.entries(object)].map((entry) => [transform(entry[0]), entry[1]]),
  );

export const transformValues = <T, V>(
  object: Record<string | number | symbol, T>,
  transform: (value: T) => V,
): Record<string | number | symbol, V> =>
  Object.fromEntries(
    [...Object.entries(object)].map((entry) => [entry[0], transform(entry[1])]),
  );

export const lowerCaseFirst = (input: string) => {
  return input.charAt(0).toLowerCase() + input.substring(1);
};

export const asyncFilter = async <T>(
  arr: T[],
  predicate: (e: T) => Promise<boolean>,
) =>
  Promise.all(arr.map(predicate)).then((results) =>
    arr.filter((_v, index) => results[index]),
  );

export const passThroughUndefined =
  <Input, Output>(func: (input: Input) => Output) =>
    (input: Input | undefined) =>
      input && func(input);

export const countBy = <T, V extends string | number | symbol>(
  arr: T[],
  fn: (val: T) => V,
): Record<V, number> =>
  arr.map(fn).reduce(
    (acc: Record<V, number>, val) => {
      acc[val] = (acc[val] || 0) + 1;
      return acc;
    },
    {} as Record<V, number>,
  );

export const groupBy = <T, V extends string | number | symbol>(
  arr: T[],
  fn: (val: T) => V,
): Record<V, T[]> =>
  arr.reduce(
    (acc: Record<V, T[]>, val) => {
      acc[fn(val)] = [...(acc[fn(val)] || []), val];
      return acc;
    },
    {} as Record<V, T[]>,
  );

export const dateSorter =
  <T extends { createdAt: string }>(): ((v0: T, v1: T) => number) =>
    (v0: T, v1: T) =>
      Date.parse(v0.createdAt) - Date.parse(v1.createdAt);

export const getUniqueBy = <T, V = string>(
  arr: T[],
  predicate: (o: T) => V,
) => {
  const set = new Set<V>();
  return arr.filter((o) => !set.has(predicate(o)) && set.add(predicate(o)));
};

export const interpolate = (
  text: string | undefined,
  params: Record<string, string> = {},
) => {
  try {
    if (!text) return text;

    const names = Object.keys(params);
    const vals = Object.values(params);
    return new Function(...names, `return \`${text}\`;`)(...vals);
  } catch {
    throw new Error(
      `Failed to interpolate "${text}" with ${JSON.stringify(params)}, error`,
    );
  }
};

export const sleep = async (seconds: number) => {
  await new Promise((resolve) => {
    setTimeout(resolve, seconds * 1000);
  });
};

export const deepSet = <T>(
  obj: T,
  path: string | (string | number)[],
  val: unknown,
): T => {
  const keys = Array.isArray(path)
    ? path
    : path
      .replace(/(\w)\[/g, '$1.[')
      .split('.')
      .map((k) =>
        k.includes('[') ? parseInt(k.substring(1, k.length - 1)) : k,
      );

  let subObject: unknown = obj;
  for (let i = 0; i < keys.length; i++) {
    const currentKey = keys[i];
    const nextKey = keys[i + 1];

    if (typeof nextKey !== 'undefined') {
      // @ts-expect-error deepset is not really typeable
      subObject[currentKey] = subObject[currentKey]
        ? // @ts-expect-error deepset is not really typeable
        subObject[currentKey]
        : // @ts-expect-error deepset is not really typeable
        isNaN(nextKey)
          ? {}
          : [];
    } else {
      // @ts-expect-error deepset is not really typeable
      subObject[currentKey] = val;
    }

    // @ts-expect-error deepset is not really typeable
    subObject = subObject[currentKey];
  }
  return obj;
};

export const deepGet = (obj: unknown, path: (string | number)[]) =>
  // @ts-expect-error deepget is not typeable
  path.reduce((o, i) => o[i], obj);

/**
 * Checks if a value is valid => not (null, undefined, empty, etc.)
 * Special case: treats 0 as a valid value unlike standard JS truthiness
 */
export const hasValue = (v: unknown): boolean => v === 0 || !!v;

export const kebabToCamelCase = (str: string) => {
  return str.replace(/-([a-z])/g, function (_match, letter) {
    return letter.toUpperCase();
  });
};

export const formatTimeStamp = (
  timestamp: number | null,
  startDate?: number | null,
) => {
  if (!timestamp) {
    if (startDate) {
      const startDateObj = new Date(startDate * 1000);
      const nextMonth = new Date(startDateObj);
      nextMonth.setMonth(nextMonth.getMonth() + 1);

      if (nextMonth.getDate() !== startDateObj.getDate()) {
        nextMonth.setDate(0);
      }

      return nextMonth.toLocaleDateString();
    }
    return 'N/A';
  }
  return new Date(timestamp * 1000).toLocaleDateString();
};

const getMode = (config: CommunityConfig, profileSettings: ProfileSettings | undefined, systemTheme: 'dark' | 'light'): 'dark' | 'light' => {
  if (profileSettings) {
    if (profileSettings.theme === "system") {
      return systemTheme;
    } else if (profileSettings?.theme === "dark") {
      return "dark";
    } else if (profileSettings?.theme === "light") {
      return "light";
    }
  }
  return config.theme.base === 'OpenpeepsDark' ? 'dark' : 'light';
}

export const getTheme = (
  config: CommunityConfig,
  profileSettings?: ProfileSettings,
  systemTheme: 'dark' | 'light' = getSystemTheme()
) =>
  getMode(config, profileSettings, systemTheme) === 'dark' ?
    { ...config.theme.dark, dark: true } :
    { ...config.theme.light, dark: false };

export const getSystemTheme = () => {
  if (typeof window !== "undefined" && window.matchMedia) {
    const systemIsDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    return systemIsDark ? "dark" : "light"
  }
  return 'light';
}

export const getProfileAvatar = (
  profile: PublicProfile | undefined | null,
  config: CommunityConfig,
) => {
  return profile?.avatar
    ? profile.avatar
    : (getTheme(config).defaultProfileAvatar as string);
};

export const getGroupAvatar = (
  group: GroupWithMeta | GroupData | undefined | null,
  config: CommunityConfig,
) => {
  return group?.avatar
    ? group.avatar
    : (getTheme(config).defaultGroupAvatar as string);
};

export const extractDateFromUUIDv7 = (uuidV7: string): string => {
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!UUID_REGEX.test(uuidV7)) {
    throw new Error('Invalid UUID format');
  }

  const versionChar = uuidV7[14];
  if ((parseInt(versionChar, 16) & 0xf) !== 0x7) {
    throw new Error('Not a UUIDv7 - version bits are not 7');
  }

  const hex = uuidV7.replace(/-/g, '');

  const timestampHex = hex.slice(0, 12);
  const timestampMs = parseInt(timestampHex, 16);

  const date = new Date(timestampMs);

  const pad = (num: number, size: number): string => {
    let s = String(num);
    while (s.length < size) { s = '0' + s; }
    return s;
  };

  return (
    date.getUTCFullYear().toString() +
    pad(date.getUTCMonth() + 1, 2) +   // months are zero‑based
    pad(date.getUTCDate(), 2) +
    pad(date.getUTCHours(), 2) +
    pad(date.getUTCMinutes(), 2)
  );
};

export const formatSize = (bytes: number) => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' kB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

export const hasVisibilityChanged = (
  previousAudienceSetting: AudienceSetting,
  newAudienceSetting: AudienceSetting
): boolean => {
  if (previousAudienceSetting.visibility !== newAudienceSetting.visibility) {
    return true;
  }

  if (previousAudienceSetting.groupId !== newAudienceSetting.groupId) {
    return true;
  }

  const prevAudience = previousAudienceSetting.audience ?? [];
  const newAudience = newAudienceSetting.audience ?? [];

  if (prevAudience.length !== newAudience.length) {
    return true;
  }

  const prevIds = prevAudience.map((p) => p.id).sort();
  const newIds = newAudience.map((p) => p.id).sort();

  for (let i = 0; i < prevIds.length; i++) {
    if (prevIds[i] !== newIds[i]) {
      return true;
    }
  }

  return false;
};