import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input, Label, Toast } from '@openpeepshq/react-ui';
import { useT, useOpenpeeps } from '@openpeepshq/react';
import { AuthLayout } from '@openpeepshq/react/components';

import { performResetPassword } from '../../lib/auth';

export function ResetPassword() {
  const t = useT();
  const navigate = useNavigate();
  const { client } = useOpenpeeps();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [token, setToken] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Token arrives as `#token=...` in the URL hash.
    setToken(window.location.hash.replace(/^#token=/, ''));
  }, []);

  const handleSubmit = async () => {
    setError(null);
    try {
      await performResetPassword(client, { password }, token);
      navigate('/auth/login');
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <AuthLayout navigate={navigate}>
      <form
        className="text-token flex h-fit flex-col gap-6"
        onSubmit={(e) => {
          e.preventDefault();
          void handleSubmit();
        }}
      >
        <h2 className="text-xl">
          {t('auth.resetPassword.heading', { defaultValue: 'Reset Password' })}
        </h2>

        <Label
          title={t('auth.resetPassword.newPassword', {
            defaultValue: 'New Password',
          })}
        >
          <Input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            type="password"
          />
        </Label>

        <Label
          title={t('auth.resetPassword.confirmPassword', {
            defaultValue: 'Confirm Password',
          })}
        >
          <Input
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            type="password"
          />
        </Label>

        {error && (
          <Toast variant="error" onDismiss={() => setError(null)}>
            {error}
          </Toast>
        )}

        <Button
          title={t('auth.resetPassword.heading', {
            defaultValue: 'Reset Password',
          })}
          disabled={confirmPassword !== password || password.length === 0}
          variant="variant-filled-primary"
          action={handleSubmit}
          className="w-full"
        >
          {t('auth.resetPassword.submitButton', { defaultValue: 'Submit' })}
        </Button>
      </form>
    </AuthLayout>
  );
}
