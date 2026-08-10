import { useEffect, useState } from 'react';
import {
  Link as RouterLink,
  useNavigate,
  useSearchParams,
} from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { loginRequestSchema, type LoginRequest } from '@openpeepshq/common/types';
import {
  Button,
  Form,
  FormInput,
  Link,
  SubmitButton,
  Toast,
} from '@openpeepshq/react-ui';
import { useT, useOpenpeeps, useCredentialsStore } from '@openpeepshq/react';
import {
  AuthLayout,
  useServerInfo,
  useToast,
} from '@openpeepshq/react/components';

import { performLogin } from '../../lib/auth';

export function Login() {
  const t = useT();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { client } = useOpenpeeps();
  const { credentialsStore } = useCredentialsStore();
  const serverInfo = useServerInfo();
  const { success, error: toastError } = useToast();

  const [data] = useState<LoginRequest>(() => ({ email: '', password: '' }));
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const redirectUrl = searchParams.get('redirect') ?? '/feeds/local';
  // Stripe redirects back here after checkout (cancel_url is `/auth/login`).
  const paymentParam = searchParams.get('payment');

  useEffect(() => {
    if (paymentParam === 'success') {
      success(
        t('payment.success.message', {
          defaultValue: 'Payment received. Redirecting…',
        }),
      );
    } else if (paymentParam === 'cancel') {
      toastError(
        t('payment.cancelled', { defaultValue: 'Checkout was cancelled.' }),
      );
    }
  }, [paymentParam, success, toastError, t]);

  const handleSubmit = async () => {
    setError(null);
    try {
      const tr = await performLogin(client, credentialsStore, data);
      if (tr.checkoutUrl) {
        window.location.assign(tr.checkoutUrl);
      } else {
        navigate(redirectUrl);
      }
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <AuthLayout
      redirectTo={redirectUrl}
      navigate={navigate}
      hasPayment={!!paymentParam}
    >
      <Form data={data} schema={loginRequestSchema}>
        <h2 className="text-xl" data-testid="auth-login-title">
          {t('auth.login.title', { defaultValue: 'Login' })}
        </h2>
        <p>
          {t('auth.login.welcomeBack', {
            defaultValue:
              'Welcome back, enter details below to log into your community',
          })}
        </p>

        <FormInput
          path={['email']}
          placeholder={t('auth.login.emailPlaceholder', {
            defaultValue: 'you@email.org',
          })}
          description={t('auth.login.email', { defaultValue: 'Email' })}
          testId="auth-login-email"
        />

        <FormInput
          path={['password']}
          description={t('auth.login.password', { defaultValue: 'Password' })}
          type={showPassword ? 'text' : 'password'}
          testId="auth-login-password"
          tail={
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={
                showPassword
                  ? t('auth.login.hidePassword', {
                      defaultValue: 'Hide password',
                    })
                  : t('auth.login.showPassword', {
                      defaultValue: 'Show password',
                    })
              }
              className="m-0 !p-0"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          }
        />

        <span className="px-2">
          <Link action="/auth/request-reset-password" className="text-sm">
            {t('auth.login.forgotPassword', {
              defaultValue: 'Forgot Password?',
            })}
          </Link>
        </span>

        {error && (
          <Toast variant="error" onDismiss={() => setError(null)}>
            {error}
          </Toast>
        )}

        <SubmitButton
          action={handleSubmit}
          title={t('auth.login.logIn', { defaultValue: 'Log in' })}
          disable={false}
        >
          {t('auth.login.logIn', { defaultValue: 'Log in' })}
        </SubmitButton>
      </Form>

      {serverInfo.sso?.oidc && serverInfo.sso.oidc.length > 0 && (
        <div className="mt-4 flex flex-col gap-2">
          {serverInfo.sso.oidc.map((provider) => (
            <Button
              key={provider.id}
              variant="variant-ringed-surface"
              action={`/api/openpeeps/core/v1/sso/oidc/${provider.id}/authorize`}
              className="w-full justify-center"
              data-testid={`auth-login-oidc-${provider.id}`}
            >
              {t('auth.login.loginWith', {
                defaultValue: 'Login with {{provider}}',
                provider: provider.name,
              })}
            </Button>
          ))}
        </div>
      )}

      <div className="flex justify-between px-2 pt-4">
        {serverInfo.communityConfig?.settings?.openRegistrations && (
          <span>
            <RouterLink to="/about" className="op-anchor text-sm">
              {t('auth.login.joinCommunity', {
                defaultValue: 'Join Community',
              })}
            </RouterLink>
          </span>
        )}
        {serverInfo.publicContent && (
          <span>
            <RouterLink to="/feeds/local" className="op-anchor text-sm">
              {t('auth.login.seeCommunityFeed', {
                defaultValue: 'See community feed',
              })}
            </RouterLink>
          </span>
        )}
      </div>
    </AuthLayout>
  );
}
