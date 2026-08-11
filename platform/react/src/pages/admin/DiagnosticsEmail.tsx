import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useT, useOpenpeeps, useSetPageHeader } from '../../index';
import { Button, Toast } from '@openpeepshq/react-ui';

const formatFailureTime = (finishedOn: number) => {
  const iso = new Date(finishedOn).toISOString();
  return `${iso.slice(0, 10)} ${iso.slice(11, 19)} UTC`;
};

export function AdminDiagnosticsEmail() {
  const t = useT();
  const { openpeepsApi } = useOpenpeeps();
  const statsQuery = openpeepsApi.admin.useEmailQueueStats();
  const queueTest = openpeepsApi.admin.queueTestEmailAction();

  useSetPageHeader(t('diagnostics.email.title', { defaultValue: 'Email' }));

  const [recipient, setRecipient] = useState('');
  const [queuing, setQueuing] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const stats = statsQuery.data;

  const handleQueueTest = async () => {
    const trimmed = recipient.trim();
    if (!trimmed) {
      setMessage({
        type: 'error',
        text: t('diagnostics.email.recipientRequired'),
      });
      return;
    }
    setQueuing(true);
    setMessage(null);
    try {
      await queueTest({ to: trimmed });
      setMessage({
        type: 'success',
        text: t('diagnostics.email.queueSuccess'),
      });
      await statsQuery.refetch();
    } catch (err) {
      const detail = (err as Error).message;
      setMessage({
        type: 'error',
        text: detail
          ? `${t('diagnostics.email.queueFailed')}: ${detail}`
          : t('diagnostics.email.queueFailed'),
      });
    } finally {
      setQueuing(false);
    }
  };

  const counters: { labelKey: string; value: number; error?: boolean }[] = stats
    ? [
        { labelKey: 'waiting', value: stats.counts.waiting },
        { labelKey: 'active', value: stats.counts.active },
        { labelKey: 'completed', value: stats.counts.completed },
        { labelKey: 'failed', value: stats.counts.failed, error: true },
        { labelKey: 'delayed', value: stats.counts.delayed },
        { labelKey: 'prioritized', value: stats.counts.prioritized },
      ]
    : [];

  return (
    <div className="space-y-6 p-4">
      <div className="bg-surface-2 rounded-lg p-4">
        <p className="font-medium">{t('diagnostics.email.testTitle')}</p>
        <p className="mb-3 text-sm opacity-80">
          {t('diagnostics.email.testHint')}
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex-1">
            <span>{t('diagnostics.email.testRecipient')}</span>
            <input
              type="email"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              className="op-input rounded"
              placeholder={t('diagnostics.email.testRecipientPlaceholder')}
              autoComplete="email"
            />
          </label>
          <Button
            variant="secondary"
            title={t('diagnostics.email.queueTest')}
            action={handleQueueTest}
            disabled={queuing}
          >
            {queuing
              ? t('common.form.loading')
              : t('diagnostics.email.queueTest')}
          </Button>
        </div>
        {message ? (
          <Toast variant={message.type} onDismiss={() => setMessage(null)}>
            {message.text}
          </Toast>
        ) : null}
      </div>

      <div className="bg-surface-2 rounded-lg p-4">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p className="font-medium">{t('diagnostics.email.queueTitle')}</p>
          <Button
            variant="secondary"
            title={t('diagnostics.email.refresh')}
            action={() => statsQuery.refetch()}
          >
            {t('diagnostics.email.refresh')}
          </Button>
        </div>
        <p className="mb-3 text-sm opacity-80">
          {t('diagnostics.email.countsHint')}
        </p>

        {statsQuery.isPending ? (
          <p className="text-sm opacity-70">{t('common.form.loading')}</p>
        ) : statsQuery.isError ? (
          <p className="text-error text-sm">
            {t('diagnostics.email.statsError')}
          </p>
        ) : stats ? (
          <>
            <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3 md:grid-cols-6">
              {counters.map((c) => (
                <div key={c.labelKey}>
                  <dt className="opacity-70">
                    {t(`diagnostics.email.${c.labelKey}`)}
                  </dt>
                  <dd className={`font-mono ${c.error ? 'text-error' : ''}`}>
                    {c.value}
                  </dd>
                </div>
              ))}
            </dl>

            {stats.recentFailures.length > 0 ? (
              <div className="border-border mt-4 border-t pt-3">
                <p className="text-error mb-2 font-medium">
                  {t('diagnostics.email.recentFailures')}
                </p>
                <ul className="space-y-2 text-sm">
                  {stats.recentFailures.map((f, idx) => (
                    <li
                      key={`${f.queue}-${f.id ?? f.name}-${idx}`}
                      className="border-error/30 bg-error/10 rounded border p-2"
                    >
                      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
                        {f.id ? (
                          <Link
                            to={`/admin/diagnostics/jobs/${encodeURIComponent(f.queue)}/${encodeURIComponent(f.id)}`}
                            className="op-anchor font-mono text-xs"
                            title={t('diagnostics.jobs.viewLogs')}
                          >
                            {f.name}
                          </Link>
                        ) : (
                          <span className="font-mono text-xs opacity-80">
                            {f.name}
                          </span>
                        )}
                        {f.finishedOn != null ? (
                          <time
                            className="text-xs opacity-70"
                            dateTime={new Date(f.finishedOn).toISOString()}
                          >
                            {formatFailureTime(f.finishedOn)}
                          </time>
                        ) : null}
                      </div>
                      <p className="whitespace-pre-wrap break-words">
                        {f.failedReason}
                      </p>
                      {f.id ? (
                        <Link
                          to={`/admin/diagnostics/jobs/${encodeURIComponent(f.queue)}/${encodeURIComponent(f.id)}`}
                          className="op-anchor mt-1 inline-block text-xs"
                        >
                          {t('diagnostics.jobs.viewLogs')}
                        </Link>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </>
        ) : null}

        <p className="mt-4 text-xs opacity-70">
          {t('diagnostics.email.bounceNote')}
        </p>
      </div>
    </div>
  );
}
