import { useState } from 'react';
import { useT, useOpenpeeps } from '@openpeeps/react';
import { useCurrentAccount } from '@openpeeps/react/components';
import { Button, Input, Label } from '@openpeeps/react-ui';

export function AccountSettings() {
  const t = useT();
  const { openpeepsApi } = useOpenpeeps();
  const account = useCurrentAccount();
  const updateAccount = openpeepsApi.updateCurrentAccountAction();

  const [email, setEmail] = useState(account?.email ?? '');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<
    { type: 'success' | 'error'; message: string } | null
  >(null);

  const submit = async () => {
    setStatus(null);
    if (newPassword && newPassword !== confirmPassword) {
      setStatus({ type: 'error', message: 'Passwords do not match' });
      return;
    }
    if (!oldPassword) {
      setStatus({
        type: 'error',
        message: 'You must provide your old password',
      });
      return;
    }
    setSubmitting(true);
    try {
      await updateAccount({
        email,
        oldPassword,
        newPassword: newPassword || undefined,
        confirmPassword: confirmPassword || undefined,
      });
      setStatus({
        type: 'success',
        message: t('settings.account.updateSuccess', {
          defaultValue: 'Account updated',
        }),
      });
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setStatus({
        type: 'error',
        message: t('settings.account.updateFailed', {
          defaultValue: `Failed: ${(err as Error).message}`,
          error: (err as Error).message,
        }),
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 p-4">
      <h1 className="text-2xl font-semibold">
        {t('settings.account.title', { defaultValue: 'Account' })}
      </h1>

      <div className="space-y-2">
        <Label htmlFor="oldPassword">
          {t('settings.account.oldPassword', {
            defaultValue: 'Current password',
          })}
        </Label>
        <Input
          id="oldPassword"
          type="password"
          autoComplete="current-password"
          value={oldPassword}
          onChange={(e) => setOldPassword(e.target.value)}
          data-testid="settings-current-password-input"
        />
        <p className="text-xs text-muted-foreground">
          {t('settings.account.oldPasswordDescription', {
            defaultValue: 'Required to change your email or password.',
          })}
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">
          {t('settings.account.email', { defaultValue: 'Email' })}
        </Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          data-testid="settings-email-input"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="newPassword">
          {t('settings.account.newPassword', {
            defaultValue: 'New password',
          })}
        </Label>
        <Input
          id="newPassword"
          type="password"
          autoComplete="new-password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">
          {t('settings.account.confirmPassword', {
            defaultValue: 'Confirm new password',
          })}
        </Label>
        <Input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
      </div>

      {status && (
        <p
          className={`rounded-md border p-2 text-sm ${status.type === 'error' ? 'border-error/40 text-error' : 'border-success/40 text-success'}`}
        >
          {status.message}
        </p>
      )}

      <Button
        title="Save"
        variant="variant-filled-primary"
        action={submit}
        disabled={submitting}
        data-testid="settings-save-button"
      >
        {submitting
          ? t('common.submitting', { defaultValue: 'Submitting…' })
          : t('common.submit', { defaultValue: 'Submit' })}
      </Button>
    </div>
  );
}
