import type { CoreConfig, ServerInfo } from '../types';

/** Query param that keeps the native password form when `sso.onlySSO` is set. */
export const LOCAL_LOGIN_PARAM = 'local';

export type SsoLoginDestination = {
  href: string;
  name?: string;
  testId: string;
};

export const isAllowedSsoLoginUrl = (url: string): boolean => {
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) return true;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

export const oidcAuthorizePath = (id: string): string =>
  `/api/openpeeps/core/v1/sso/oidc/${encodeURIComponent(id)}/authorize`;

export const ssoLoginDestinations = (
  sso: Pick<NonNullable<ServerInfo['sso']>, 'generic' | 'oidc'> | undefined,
): SsoLoginDestination[] => {
  const destinations: SsoLoginDestination[] = [];
  for (const provider of sso?.generic ?? []) {
    destinations.push({
      href: provider.loginLink,
      name: provider.name,
      testId: `auth-login-generic-${provider.id}`,
    });
  }
  for (const provider of sso?.oidc ?? []) {
    destinations.push({
      href: oidcAuthorizePath(provider.id),
      name: provider.name,
      testId: `auth-login-oidc-${provider.id}`,
    });
  }
  return destinations;
};

export type OnlySsoView =
  | { mode: 'form' }
  | { mode: 'redirect'; href: string }
  | { mode: 'chooser'; destinations: SsoLoginDestination[] };

export const resolveOnlySsoView = (
  sso: ServerInfo['sso'],
  searchParams: { has: (name: string) => boolean },
): OnlySsoView => {
  if (!sso?.onlySSO || searchParams.has(LOCAL_LOGIN_PARAM)) {
    return { mode: 'form' };
  }
  const destinations = ssoLoginDestinations(sso);
  const [only] = destinations;
  if (only && destinations.length === 1) {
    return { mode: 'redirect', href: only.href };
  }
  return { mode: 'chooser', destinations };
};

export const publicSsoInfo = (sso: CoreConfig['sso']): ServerInfo['sso'] => {
  const oidc = sso.oidc.map((provider) => ({
    id: provider.id,
    name: provider.name,
  }));
  const generic = sso.generic.flatMap((provider) => {
    const loginLink = provider.loginLink?.trim();
    if (!loginLink || !isAllowedSsoLoginUrl(loginLink)) return [];
    return [
      {
        id: provider.id,
        name: provider.name,
        loginLink,
      },
    ];
  });
  const onlySSO = !!sso.onlySSO;
  if (oidc.length === 0 && generic.length === 0 && !onlySSO) {
    return undefined;
  }
  return {
    oidc,
    generic,
    ...(onlySSO ? { onlySSO: true } : {}),
  };
};
