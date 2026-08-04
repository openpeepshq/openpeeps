import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input, Label, Toast } from '@openpeeps/react-ui';
import { useT, useOpenpeeps } from '@openpeeps/react';
import { AuthLayout } from '@openpeeps/react/components';

import { performRequestResetPassword } from '../../lib/auth';

export function RequestResetPassword() {
  const t = useT();
  const navigate = useNavigate();
  const { client } = useOpenpeeps();

  const [email, setEmail] = useState('');
  const [prompt, setPrompt] = useState(
    t('auth.requestResetPassword.prompt', {
      defaultValue:
        'Enter your email address and we will send you a link to reset your password.',
    }),
  );
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    setNotice(null);
    try {
      await performRequestResetPassword(client, { email });
      setPrompt(
        t('auth.requestResetPassword.successPrompt', {
          defaultValue:
            "If your email belongs to an account in this community, you'll receive a message with a link where you can change your password.",
        }),
      );
      setNotice(
        t('auth.requestResetPassword.successToast', {
          defaultValue:
            'Reset password link has been sent to {{email}} successfully.',
          email,
        }),
      );
    } catch (err) {
      setError(
        (err as Error).message ||
          t('auth.requestResetPassword.errorFallback', {
            defaultValue: 'Failed to send reset password link, wrong email',
          }),
      );
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
        <h2 className="text-xl" data-testid="auth-request-reset-heading">
          {t('auth.requestResetPassword.heading', {
            defaultValue: 'Request Password Reset',
          })}
        </h2>
        <p className="pt-4">{prompt}</p>

        <Label
          title={t('auth.requestResetPassword.email', {
            defaultValue: 'Email',
          })}
        >
          <Input
            type="email"
            data-testid="auth-request-reset-email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder={t('auth.requestResetPassword.emailPlaceholder', {
              defaultValue: 'you@email.org',
            })}
          />
        </Label>

        {error && (
          <p className="text-error border-error/40 rounded-md border p-2 text-sm">
            {error}
          </p>
        )}
        {notice && (
          <Toast variant="success" onDismiss={() => setNotice(null)}>
            {notice}
          </Toast>
        )}

        <Button
          title={t('auth.requestResetPassword.title', {
            defaultValue: 'Request Password Reset',
          })}
          action={handleSubmit}
          variant="variant-filled-primary"
          className="w-full"
          data-testid="auth-request-reset-submit"
        >
          {t('auth.requestResetPassword.proceed', { defaultValue: 'Proceed' })}
        </Button>
      </form>
    </AuthLayout>
  );
}
