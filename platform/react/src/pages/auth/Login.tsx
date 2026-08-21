import { useEffect, useState, type ReactNode } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  LOCAL_LOGIN_PARAM,
  resolveOnlySsoView,
  ssoLoginDestinations,
} from '@openpeepshq/common/lib';
import {
  loginRequestSchema,
  type LoginRequest,
} from '@openpeepshq/common/types';
import {
  Button,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Link,
  Toast,
} from '@openpeepshq/react-ui';
import {
  useT,
  useOpenpeeps,
  useCredentialsStore,
  useNavigate,
  useSearchParams,
  useHrefOf,
} from '../../index';
import { AuthLayout, useServerInfo, useToast } from '../../components';

import { performLogin } from '../../lib/auth';

export function Login() {
  const t = useT();
  const navigate = useNavigate();
  const searchParams = useSearchParams();
  const href = useHrefOf();
  const { client } = useOpenpeeps();
  const { credentialsStore } = useCredentialsStore();
  const serverInfo = useServerInfo();
  const { success, error: toastError } = useToast();

  const form = useForm<LoginRequest>({
    resolver: zodResolver(loginRequestSchema),
    defaultValues: { email: '', password: '' },
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const redirectUrl =
    searchParams.get('redirect') ?? href({ type: 'feed', feed: 'local' });
  const paymentParam = searchParams.get('payment');
  const destinations = ssoLoginDestinations(serverInfo.sso);
  const onlySsoView = resolveOnlySsoView(serverInfo.sso, searchParams);
  const ssoRedirect =
    onlySsoView.mode === 'redirect' ? onlySsoView.href : undefined;

  useEffect(() => {
    if (!ssoRedirect) return;
    window.location.replace(ssoRedirect);
  }, [ssoRedirect]);

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

  const onSubmit = form.handleSubmit(async (data) => {
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
  });

  const layout = (children: ReactNode) => (
    <AuthLayout
      redirectTo={redirectUrl}
      navigate={(url) => void navigate(url)}
      hasPayment={!!paymentParam}
    >
      {children}
    </AuthLayout>
  );

  const localLoginHref = (() => {
    const params = new URLSearchParams(searchParams);
    params.set(LOCAL_LOGIN_PARAM, '1');
    return `/auth/login?${params.toString()}`;
  })();

  const adminLoginLink = (
    <a href={localLoginHref} className="sr-only" data-testid="auth-login-local">
      {t('auth.login.adminLogin', { defaultValue: 'Administrator login' })}
    </a>
  );

  const ssoButtons =
    destinations.length > 0 ? (
      <div className="mt-4 flex flex-col gap-2">
        {destinations.map((destination) => (
          <Button
            key={destination.testId}
            variant="outline"
            action={destination.href}
            className="w-full justify-center"
            data-testid={destination.testId}
          >
            {destination.name
              ? t('auth.login.loginWith', {
                  defaultValue: 'Login with {{provider}}',
                  provider: destination.name,
                })
              : t('auth.login.loginLink', {
                  defaultValue: 'Continue to sign in',
                })}
          </Button>
        ))}
      </div>
    ) : null;

  const extraLinks = (
    <div className="flex justify-between px-2 pt-4">
      {serverInfo.communityConfig?.settings?.openRegistrations && (
        <span>
          <RouterLink
            to={href({ type: 'about' })}
            className="op-anchor text-sm"
          >
            {t('auth.login.joinCommunity', {
              defaultValue: 'Join Community',
            })}
          </RouterLink>
        </span>
      )}
      {serverInfo.publicContent && (
        <span>
          <RouterLink
            to={href({ type: 'feed', feed: 'local' })}
            className="op-anchor text-sm"
          >
            {t('auth.login.seeCommunityFeed', {
              defaultValue: 'See community feed',
            })}
          </RouterLink>
        </span>
      )}
    </div>
  );

  if (ssoRedirect) {
    return layout(
      <>
        <p data-testid="auth-login-sso-redirect">
          {t('auth.login.redirectingToSso', {
            defaultValue: 'Redirecting you to sign in…',
          })}
        </p>
        {adminLoginLink}
      </>,
    );
  }

  if (onlySsoView.mode === 'chooser') {
    return layout(
      <>
        <h2 className="text-xl" data-testid="auth-login-title">
          {t('auth.login.title', { defaultValue: 'Login' })}
        </h2>
        {ssoButtons}
        {adminLoginLink}
        {extraLinks}
      </>,
    );
  }

  return layout(
    <>
      <Form {...form}>
        <form className="flex flex-col gap-3" onSubmit={onSubmit}>
          <h2 className="text-xl" data-testid="auth-login-title">
            {t('auth.login.title', { defaultValue: 'Login' })}
          </h2>
          <p>
            {t('auth.login.welcomeBack', {
              defaultValue:
                'Welcome back, enter details below to log into your community',
            })}
          </p>

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {t('auth.login.email', { defaultValue: 'Email' })}
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="email"
                    autoComplete="email"
                    placeholder={t('auth.login.emailPlaceholder', {
                      defaultValue: 'you@email.org',
                    })}
                    data-testid="auth-login-email"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {t('auth.login.password', { defaultValue: 'Password' })}
                </FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      {...field}
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      data-testid="auth-login-password"
                      className="pr-10"
                    />
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
                      className="absolute right-2 top-1/2 -translate-y-1/2"
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <span className="px-2">
            <Link
              action={href({ type: 'auth', mode: 'request-reset-password' })}
              className="text-sm"
            >
              {t('auth.login.forgotPassword', {
                defaultValue: 'Forgot Password?',
              })}
            </Link>
          </span>

          {error && (
            <Toast
              variant="error"
              testId="auth-login-error"
              onDismiss={() => setError(null)}
            >
              {error}
            </Toast>
          )}

          <Button
            type="submit"
            variant="default"
            title={t('auth.login.logIn', { defaultValue: 'Log in' })}
            loading={form.formState.isSubmitting}
            data-testid="auth-login-submit"
          >
            {t('auth.login.logIn', { defaultValue: 'Log in' })}
          </Button>
        </form>
      </Form>

      {ssoButtons}
      {extraLinks}
    </>,
  );
}
