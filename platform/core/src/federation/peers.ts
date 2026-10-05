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

export const peerHostAllowed = async (
  value: string | URL | null | undefined,
): Promise<boolean> => {
  if (value == null) return false;
  const host = hostnameOf(value);
  if (!host) return false;
  const cfg = await config();
  return hostIsAllowed(host, cfg.federation.allowedHosts);
};

export const federationIsActive = async (): Promise<boolean> =>
  (await config()).federation.active;
