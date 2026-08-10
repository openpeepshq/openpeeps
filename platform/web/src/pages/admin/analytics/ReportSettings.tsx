import { useEffect, useState } from 'react';
import { ShadcnButton } from '@openpeepshq/react-ui';
import { useOpenpeeps, useT } from '@openpeepshq/react';
import { AnalyticsLoading } from './AnalyticsLayout';

const parseRecipients = (raw: string) =>
  raw
    .split(/[\n,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);

export const AnalyticsReportSettingsPage = () => {
  const t = useT();
  const { openpeepsApi } = useOpenpeeps();
  const query = openpeepsApi.admin.useAnalyticsReportSettings();
  const updateSettings =
    openpeepsApi.admin.updateAnalyticsReportSettingsAction();
  const [enabled, setEnabled] = useState(false);
  const [recipientsText, setRecipientsText] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!query.data) return;
    setEnabled(query.data.enabled);
    setRecipientsText(query.data.recipients.join('\n'));
  }, [query.data]);

  if (query.isLoading) return <AnalyticsLoading />;
  if (!query.data) return null;

  const onSave = async () => {
    setBusy(true);
    setMessage(null);
    try {
      await updateSettings({
        enabled,
        recipients: parseRecipients(recipientsText),
      });
      setMessage(
        t('admin.analytics.reports.saved', {
          defaultValue: 'Report settings saved',
        }),
      );
      await query.refetch();
    } catch {
      setMessage(
        t('admin.analytics.reports.saveFailed', {
          defaultValue: 'Failed to save report settings',
        }),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <section className="bg-background rounded-xl border p-4 shadow-sm">
        <h2 className="text-muted-foreground mb-1 text-xs font-semibold uppercase tracking-wide">
          {t('admin.analytics.reports.title', {
            defaultValue: 'Monthly board report',
          })}
        </h2>
        <p className="text-muted-foreground mb-4 text-sm">
          {t('admin.analytics.reports.help', {
            defaultValue:
              'When enabled, a narrative PDF report for the previous calendar month is emailed on the 1st at 08:00 UTC.',
          })}
        </p>

        <label className="mb-4 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
          />
          {t('admin.analytics.reports.enabled', {
            defaultValue: 'Enable monthly report emails',
          })}
        </label>

        <label className="block text-sm">
          <span className="mb-1 block font-medium">
            {t('admin.analytics.reports.recipients', {
              defaultValue: 'Recipients',
            })}
          </span>
          <textarea
            className="border-input bg-background min-h-28 w-full rounded-md border px-3 py-2 text-sm"
            value={recipientsText}
            onChange={(e) => setRecipientsText(e.target.value)}
            placeholder="ops@example.com"
          />
          <span className="text-muted-foreground mt-1 block text-xs">
            {t('admin.analytics.reports.recipientsHelp', {
              defaultValue: 'One email per line, or comma-separated.',
            })}
          </span>
        </label>

        <div className="mt-4 flex items-center gap-3">
          <ShadcnButton
            type="button"
            size="sm"
            disabled={busy}
            onClick={() => void onSave()}
          >
            {t('admin.analytics.reports.save', { defaultValue: 'Save' })}
          </ShadcnButton>
          {message ? (
            <p className="text-muted-foreground text-xs">{message}</p>
          ) : null}
        </div>
      </section>
    </div>
  );
};
