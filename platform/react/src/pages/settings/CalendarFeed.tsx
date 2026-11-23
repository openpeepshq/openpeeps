import { Copy } from 'lucide-react';
import { useT, useSetPageHeader } from '../../index';
import { Button, Toast } from '@openpeepshq/react-ui';
import { useCalendarFeedLink } from '../../hooks';

export function CalendarFeedSettings() {
  const t = useT();
  const {
    feedUrl,
    creating,
    revoking,
    status,
    clearStatus,
    createLink,
    revokeLink,
  } = useCalendarFeedLink();

  useSetPageHeader(
    t('settings.calendarFeed.title', { defaultValue: 'Calendar feed' }),
  );

  return (
    <div className="space-y-6 p-4">
      <section className="space-y-3 rounded-md border p-4">
        <h2 className="text-lg font-medium">
          {t('settings.calendarFeed.introTitle', {
            defaultValue: 'Subscribe to the calendar',
          })}
        </h2>
        <p className="text-muted-foreground text-sm">
          {t('settings.calendarFeed.introDescription', {
            defaultValue:
              'Get an iCalendar (ICS) feed with the local events, ready to import into any calendar app that supports subscriptions. Creating a link here replaces and revokes any previous one, and each link expires after 90 days.',
          })}
        </p>
        {feedUrl ? (
          <div className="space-y-2">
            <div className="rounded-md border p-3">
              <div className="flex items-start gap-2">
                <code className="break-all text-sm">{feedUrl}</code>
                <button
                  type="button"
                  title={t('settings.calendarFeed.copy', {
                    defaultValue: 'Copy',
                  })}
                  onClick={() => void navigator.clipboard.writeText(feedUrl)}
                >
                  <Copy className="size-4" />
                </button>
              </div>
            </div>
            <Button
              variant="outline"
              action={() => void revokeLink()}
              disabled={revoking}
            >
              {revoking
                ? t('settings.calendarFeed.deleting', {
                    defaultValue: 'Deleting…',
                  })
                : t('settings.calendarFeed.delete', {
                    defaultValue: 'Delete link',
                  })}
            </Button>
          </div>
        ) : (
          <Button action={() => void createLink()} disabled={creating}>
            {creating
              ? t('settings.calendarFeed.creating', {
                  defaultValue: 'Creating…',
                })
              : t('settings.calendarFeed.create', {
                  defaultValue: 'Create calendar link',
                })}
          </Button>
        )}
        {status ? (
          <Toast variant={status.type} onDismiss={clearStatus}>
            {status.message}
          </Toast>
        ) : null}
      </section>
    </div>
  );
}
