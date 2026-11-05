import { hostIsAllowed } from '@openpeepshq/common/lib';
import { config } from '../config';

export const hostnameOf = (value: string | URL): string | null => {
  try {
    const host = new URL(value).hostname
      .trim()
      .toLowerCase()
      .replace(/\.$/, '');
    return host || null;
  } catch {
    return null;
  }
};

export const pdsHostAllowed = async (
  value: string | URL | null | undefined,
): Promise<boolean> => {
  if (value == null) return false;
  const host = hostnameOf(
    typeof value === 'string' && !value.includes('://')
      ? `https://${value}`
      : value,
  );
  if (!host) return false;
  const cfg = await config();
  return hostIsAllowed(host, cfg.atproto.allowedPdsHosts);
};

export const atprotoIsActive = async (): Promise<boolean> =>
  (await config()).atproto.active;

export const atprotoIngestEnabled = async (): Promise<boolean> => {
  const cfg = await config();
  return cfg.atproto.active && cfg.atproto.ingestEnabled;
};
