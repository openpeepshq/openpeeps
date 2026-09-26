import { useState } from 'react';
import { useT, useOpenpeeps, useSetPageHeader } from '../../index';
import { useCurrentAccount } from '../../components';
import { Button, Input, Label, Toast } from '@openpeepshq/react-ui';

export function AccountSettings() {
  const t = useT();
  const { openpeepsApi, client } = useOpenpeeps();
  const account = useCurrentAccount();
  const updateAccount = openpeepsApi.updateCurrentAccountAction();

  useSetPageHeader(t('settings.account.title', { defaultValue: 'Account' }));

  const [email, setEmail] = useState(account?.email ?? '');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [status, setStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

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

  const exportAccount = async () => {
    setExporting(true);
    try {
      const response = await client.accounts.current.export();
      if (!('data' in response)) {
        throw new Error('Export failed');
      }
      const data = response.data;
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'openpeeps-account-export.json';
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setStatus({
        type: 'error',
        message: t('settings.account.exportFailed', {
          defaultValue: `Failed: ${(err as Error).message}`,
        }),
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-4 p-4">
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
          placeholder={t('settings.account.oldPasswordPlaceholder', {
            defaultValue: 'Enter your current password',
          })}
          onChange={(e) => setOldPassword(e.target.value)}
          data-testid="settings-current-password-input"
        />
        <p className="text-muted-foreground text-xs">
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
          placeholder={t('settings.account.emailPlaceholder', {
            defaultValue: 'Enter your email',
          })}
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
          placeholder={t('settings.account.newPasswordPlaceholder', {
            defaultValue: 'Enter your new password',
          })}
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
          placeholder={t('settings.account.confirmPasswordPlaceholder', {
            defaultValue: 'Confirm your new password',
          })}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
      </div>

      {status && (
        <Toast variant={status.type} onDismiss={() => setStatus(null)}>
          {status.message}
        </Toast>
      )}

      <Button
        title="Save"
        variant="default"
        action={submit}
        disabled={submitting}
        data-testid="settings-save-button"
      >
        {submitting
          ? t('common.submitting', { defaultValue: 'Submitting…' })
          : t('common.submit', { defaultValue: 'Submit' })}
      </Button>

      <div className="border-border mt-6 border-t pt-4">
        <h3 className="text-sm font-medium">
          {t('settings.account.exportData', {
            defaultValue: 'Export your data',
          })}
        </h3>
        <p className="text-muted-foreground mt-1 text-sm">
          {t('settings.account.exportDataDescription', {
            defaultValue: 'Download a copy of your account and profile data.',
          })}
        </p>
        <Button
          title={t('settings.account.downloadData', {
            defaultValue: 'Download my data',
          })}
          variant="outline"
          action={exportAccount}
          loading={exporting}
          className="mt-2"
          data-testid="settings-account-export"
        >
          {exporting
            ? t('common.downloading', { defaultValue: 'Downloading…' })
            : t('settings.account.downloadData', {
                defaultValue: 'Download my data',
              })}
        </Button>
      </div>
    </div>
  );
}
