import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input, Label } from '@openpeeps/react-ui';
import { useT, useOpenpeeps } from '@openpeeps/react';
import { AuthLayout } from '@openpeeps/react/components';

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
    // SvelteKit version reads `location.hash.substring(7)` (`#token=...`).
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
          {t('auth.resetPassword', { defaultValue: 'Reset Password' })}
        </h2>

        <Label title={t('auth.newPassword', { defaultValue: 'New Password' })}>
          <Input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            type="password"
          />
        </Label>

        <Label
          title={t('common.confirmPassword', { defaultValue: 'Confirm Password' })}
        >
          <Input
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            type="password"
          />
        </Label>

        {error && (
          <p className="text-error rounded-md border border-error/40 p-2 text-sm">
            {error}
          </p>
        )}

        <Button
          title="Reset Password"
          disabled={confirmPassword !== password || password.length === 0}
          variant="variant-filled-primary"
          action={handleSubmit}
          className="w-full"
        >
          {t('common.submit', { defaultValue: 'Submit' })}
        </Button>
      </form>
    </AuthLayout>
  );
}
