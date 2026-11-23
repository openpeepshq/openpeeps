import { useCallback, useState } from 'react';
import { buildCalendarFeedUrl } from '@openpeepshq/common';
import { useOpenpeeps } from '../../contexts/openpeeps';
import { useT } from '../../i18n/context';

export type CalendarFeedStatus =
  | { type: 'success'; message: string }
  | { type: 'error'; message: string };

// The calendar app opens the feed URL directly, so it must be absolute. `baseUrl`
// is a full URL in RN (Config.BASE_URL) and the origin on web, but may also be a
// relative subpath — strip it to the origin, falling back to the page origin.
export const resolveOrigin = (baseUrl: string): string => {
  if (baseUrl) {
    try {
      return new URL(baseUrl).origin;
    } catch {
      // relative — use the page origin below
    }
  }
  return typeof window !== 'undefined' ? window.location.origin : '';
};

export const useCalendarFeedLink = () => {
  const t = useT();
  const { openpeepsApi, baseUrl } = useOpenpeeps();
  const createCalendarFeed =
    openpeepsApi.createCurrentProfileCalendarFeedAction();
  const revokeCalendarFeed =
    openpeepsApi.revokeCurrentProfileCalendarFeedAction();

  const [creating, setCreating] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [feedUrl, setFeedUrl] = useState<string | undefined>();
  const [status, setStatus] = useState<CalendarFeedStatus | null>(null);

  const createLink = useCallback(async () => {
    setStatus(null);
    setCreating(true);
    try {
      const { token } = await createCalendarFeed();
      setFeedUrl(buildCalendarFeedUrl(resolveOrigin(baseUrl), token));
    } catch {
      setStatus({
        type: 'error',
        message: t('settings.calendarFeed.createError', {
          defaultValue: 'Could not create the calendar link.',
        }),
      });
    } finally {
      setCreating(false);
    }
  }, [createCalendarFeed, baseUrl, t]);

  const revokeLink = useCallback(async () => {
    setStatus(null);
    setRevoking(true);
    try {
      await revokeCalendarFeed();
      setFeedUrl(undefined);
      setStatus({
        type: 'success',
        message: t('settings.calendarFeed.revokeSuccess', {
          defaultValue: 'Calendar link deleted.',
        }),
      });
    } catch {
      setStatus({
        type: 'error',
        message: t('settings.calendarFeed.revokeError', {
          defaultValue: 'Could not delete the calendar link.',
        }),
      });
    } finally {
      setRevoking(false);
    }
  }, [revokeCalendarFeed, t]);

  return {
    feedUrl,
    creating,
    revoking,
    status,
    clearStatus: () => setStatus(null),
    createLink,
    revokeLink,
  };
};
