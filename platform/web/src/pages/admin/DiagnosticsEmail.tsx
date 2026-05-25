import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useT, useOpenpeeps, useSetPageHeader } from '@openpeeps/react';
import { Button, Input, Label } from '@openpeeps/react-ui';

export function AdminDiagnosticsEmail() {
  const t = useT();
  const { openpeepsApi } = useOpenpeeps();
  const statsQuery = openpeepsApi.admin.useEmailQueueStats();
  const queueTest = openpeepsApi.admin.queueTestEmailAction();

  useSetPageHeader(
    t('diagnostics.email.title', { defaultValue: 'Email diagnostics' }),
  );

  const [recipient, setRecipient] = useState('');
  const [queuing, setQueuing] = useState(false);
  const [message, setMessage] = useState<string | undefined>();

  const stats = statsQuery.data;

  const handleQueueTest = async () => {
    const trimmed = recipient.trim();
    if (!trimmed) {
      setMessage(t('diagnostics.email.recipientRequired', { defaultValue: 'Recipient is required' }));
      return;
    }
    setQueuing(true);
    setMessage(undefined);
    try {
      await queueTest({ to: trimmed });
      setMessage(t('diagnostics.email.queueSuccess', { defaultValue: 'Test email queued' }));
      await statsQuery.refetch();
    } catch (err) {
      setMessage(
        `${t('diagnostics.email.queueFailed', { defaultValue: 'Queue failed' })}: ${(err as Error).message}`,
      );
    } finally {
      setQueuing(false);
    }
  };

  return (
    <div className="space-y-6 p-4">
      <section className="space-y-3 rounded-md border p-4">
        <h2 className="text-lg font-medium">
          {t('diagnostics.email.testTitle', { defaultValue: 'Queue test email' })}
        </h2>
        <p className="text-muted-foreground text-sm">
          {t('diagnostics.email.testHint', {
            defaultValue: 'Enqueue a test message through the worker pipeline.',
          })}
        </p>
        <div className="space-y-2">
          <Label htmlFor="email-recipient">
            {t('diagnostics.email.testRecipient', { defaultValue: 'Recipient' })}
          </Label>
          <Input
            id="email-recipient"
            type="email"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder={t('diagnostics.email.testRecipientPlaceholder', {
              defaultValue: 'you@example.com',
            })}
          />
        </div>
        <Button variant="default" disabled={queuing} action={handleQueueTest}>
          {queuing
            ? 'Queuing…'
            : t('diagnostics.email.queueTest', { defaultValue: 'Queue test email' })}
        </Button>
        {message ? <p className="text-sm">{message}</p> : null}
      </section>

      <section className="space-y-3 rounded-md border p-4">
        <h2 className="text-lg font-medium">Queue stats</h2>
        {stats ? (
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Waiting</dt>
              <dd className="font-medium">{stats.counts.waiting}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Active</dt>
              <dd className="font-medium">{stats.counts.active}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Completed</dt>
              <dd className="font-medium">{stats.counts.completed}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Failed</dt>
              <dd className="font-medium">{stats.counts.failed}</dd>
            </div>
          </dl>
        ) : (
          <p className="text-muted-foreground text-sm">Loading queue stats…</p>
        )}
        {stats?.recentFailures?.length ? (
          <ul className="space-y-2 text-sm">
            {stats.recentFailures.map((failure) => (
              <li key={`${failure.queue}-${failure.id ?? failure.name}`} className="rounded-md border p-2">
                <p className="font-medium">{failure.failedReason ?? 'Unknown error'}</p>
                <p className="text-muted-foreground text-xs">
                  {failure.queue} · {failure.name} ·{' '}
                  {failure.finishedOn
                    ? new Date(failure.finishedOn).toISOString()
                    : 'unknown time'}
                </p>
                {failure.id ? (
                  <Link
                    to={`/admin/diagnostics/jobs/${encodeURIComponent(failure.queue)}/${encodeURIComponent(failure.id)}`}
                    className="text-primary mt-1 inline-block text-xs underline"
                  >
                    {t('diagnostics.jobs.viewDetails', { defaultValue: 'View job details' })}
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </div>
  );
}
