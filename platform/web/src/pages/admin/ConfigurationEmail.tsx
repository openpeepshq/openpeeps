import { useState } from 'react';
import { useT, useOpenpeeps } from '@openpeeps/react';
import { Button, Input, Label } from '@openpeeps/react-ui';

export function AdminConfigurationEmail() {
  const t = useT();
  const { openpeepsApi } = useOpenpeeps();
  const sendTest = openpeepsApi.admin.sendTestEmailAction();

  const [to, setTo] = useState('');
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | undefined>();

  const submit = async () => {
    const trimmed = to.trim();
    if (!trimmed) {
      setMessage('Recipient email is required.');
      return;
    }
    setSending(true);
    setMessage(undefined);
    try {
      await sendTest({ to: trimmed });
      setMessage('Test email sent.');
    } catch (err) {
      setMessage(`Failed to send test email: ${(err as Error).message}`);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4 p-4">
      <h1 className="text-2xl font-semibold">
        {t('configuration.email.title', { defaultValue: 'Email configuration' })}
      </h1>
      <p className="text-muted-foreground text-sm">
        Send a direct SMTP test using the server&apos;s configured transport.
      </p>
      <div className="max-w-md space-y-2">
        <Label htmlFor="smtp-test-to">Recipient</Label>
        <Input
          id="smtp-test-to"
          type="email"
          value={to}
          onChange={(e) => setTo(e.target.value)}
        />
      </div>
      <Button variant="default" disabled={sending} action={submit}>
        {sending ? 'Sending…' : 'Send test email'}
      </Button>
      {message ? <p className="text-sm">{message}</p> : null}
    </div>
  );
}
