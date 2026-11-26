import { useEffect, useRef } from 'react';
import { useHasAuthToken, useOpenpeeps } from '../../contexts/openpeeps';

const PROFILE_VIEW_DELAY_MS = 1_000;

/**
 * Records a single profile-page view (`POST /profiles/seen`) after a short
 * dwell delay. One timer + one request per profile open — the batch/queue
 * machinery of the post-view counter is unnecessary for a one-shot event.
 * No-op without an auth token, without a profile id, or when disabled.
 */
export const useProfileView = (
  profileId?: string,
  opts?: { enabled?: boolean },
) => {
  const enabled = opts?.enabled ?? true;
  const hasToken = useHasAuthToken();
  const { client } = useOpenpeeps();
  const firedFor = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!enabled || !hasToken || !profileId) {
      firedFor.current = undefined;
      return;
    }
    if (firedFor.current === profileId) return;

    const timer = setTimeout(() => {
      firedFor.current = profileId;
      void client.profiles.seen({ profileIds: [profileId] }).catch(() => {});
    }, PROFILE_VIEW_DELAY_MS);

    return () => clearTimeout(timer);
  }, [enabled, hasToken, profileId, client]);
};
