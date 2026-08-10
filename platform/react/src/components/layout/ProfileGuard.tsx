import { useEffect, useMemo, type ReactNode } from 'react';
import { checkRoleCapabilities } from '@openpeepshq/common';
import { useCurrentProfile } from './IdentityContext';

export interface ProfileGuardProps {
  neededCapabilities?: string[];
  isPubliclyAccessible?: boolean;
  /** Called when the user must authenticate. Defaults to `window.location` redirect. */
  onUnauthenticated?: (redirectTo: string) => void;
  children?: ReactNode;
}

/**
 * Translation of @openpeepshq/svelte/components/layout/ProfileGuard.svelte.
 * Hides children unless the current profile has the needed capabilities, and
 * triggers a login redirect if the profile is missing.
 */
export function ProfileGuard({
  neededCapabilities = [],
  isPubliclyAccessible = false,
  onUnauthenticated,
  children,
}: ProfileGuardProps) {
  const profile = useCurrentProfile();

  const needsRedirect =
    !isPubliclyAccessible && (!profile || profile.type !== 'local');

  useEffect(() => {
    if (!needsRedirect || typeof window === 'undefined') return;
    const redirect = `/auth/login?redirect=${window.location.pathname}`;
    if (onUnauthenticated) {
      onUnauthenticated(redirect);
    } else {
      window.location.href = redirect;
    }
  }, [needsRedirect, onUnauthenticated]);

  const authResult = useMemo(() => {
    if (needsRedirect)
      return { success: false, missingCapabilities: neededCapabilities };
    if (profile?.type === 'local' || isPubliclyAccessible) {
      return checkRoleCapabilities(profile?.roles ?? [], neededCapabilities);
    }
    return {
      success: !neededCapabilities.length,
      missingCapabilities: neededCapabilities,
    };
  }, [needsRedirect, profile, isPubliclyAccessible, neededCapabilities]);

  if (!authResult.success) return null;
  return <>{children}</>;
}
