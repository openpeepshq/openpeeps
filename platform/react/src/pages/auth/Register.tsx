import { useEffect, useMemo, useState } from 'react';
import {
  Link as RouterLink,
  useNavigate,
  useSearchParams,
} from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  registerRequestSchema,
  type RegisterRequest,
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
import { useT, useOpenpeeps, useCredentialsStore } from '../../index';
import { AuthLayout, useServerInfo, useToast } from '../../components';
import type { TFunction } from 'i18next';

import { performRegister } from '../../lib/auth';
import {
  calculatePasswordStrength,
  getStrengthMessage,
} from '../../lib/passwordStrength';

export interface RegisterProps {
  invite?: boolean;
}

const buildRegisterFormSchema = (t: TFunction) =>
  registerRequestSchema
    .refine((d) => d.password === d.confirmPassword, {
      message: t('auth.register.passwordsDoNotMatch', {
        defaultValue: 'Passwords do not match',
      }),
      path: ['confirmPassword'],
    })
    .refine((d) => d.privacyPolicyAccepted, {
      message: t('auth.register.mustAgreePrivacyPolicy', {
        defaultValue: 'You must agree to the privacy policy',
      }),
      path: ['privacyPolicyAccepted'],
    });

export function Register({ invite = false }: RegisterProps) {
  const t = useT();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { client, openpeepsApi } = useOpenpeeps();
  const createCheckout = openpeepsApi.createCheckoutAction();
  const { credentialsStore } = useCredentialsStore();
  const serverInfo = useServerInfo();
  const { success, error: toastError } = useToast();

  const registerFormSchema = useMemo(() => buildRegisterFormSchema(t), [t]);

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

  const form = useForm<RegisterRequest>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      email: '',
      handle: '',
      displayName: '',
      password: '',
      privacyPolicyAccepted: false,
      confirmPassword: '',
    },
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const inviteCode = searchParams.get('inviteCode');
    if (inviteCode) form.setValue('inviteCode', inviteCode);
  }, [searchParams, form]);

  // Invited sign-ups stay open even when public registration is closed.
  const registrationOpen =
    serverInfo.communityConfig?.settings?.openRegistrations;
  useEffect(() => {
    if (!invite && registrationOpen === false) {
      navigate('/auth/closed', { replace: true });
    }
  }, [invite, registrationOpen, navigate]);

  const privacyPolicyLink =
    serverInfo.communityConfig?.info?.privacyPolicy || '/docs/privacy';
  const stripeMembershipEnabled =
    !!serverInfo.payments?.stripe?.paidMembership?.enabled;

  const password = form.watch('password');
  const confirmPassword = form.watch('confirmPassword');

  const onSubmit = form.handleSubmit(async (data) => {
    setError(null);
    try {
      await performRegister(client, credentialsStore, data);
      if (stripeMembershipEnabled) {
        const checkout = await createCheckout();
        if (checkout.url) {
          window.location.href = checkout.url;
          return;
        }
      }
      navigate('/welcome');
    } catch (err) {
      setError(t((err as Error).message));
    }
  });

  return (
    <AuthLayout
      navigate={(url) => void navigate(url)}
      hasPayment={!!paymentParam}
    >
      <Form {...form}>
        <form className="flex flex-col gap-3" onSubmit={onSubmit}>
          <h2 className="text-xl">
            {t('auth.register.createAccount', {
              defaultValue: 'Create account',
            })}
          </h2>

          {invite && (
            <p className="my-2">
              {t('auth.register.inviteMessage', {
                communityName: serverInfo.communityConfig?.info?.name,
                defaultValue:
                  "You've been invited to join {{communityName}}, enter details below to be a part of the community.",
              })}
            </p>
          )}

          <FormField
            control={form.control}
            name="handle"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {t('auth.register.handle', { defaultValue: 'Handle' })}
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="text"
                    placeholder={t('auth.register.handlePlaceholder', {
                      defaultValue: 'Handle',
                    })}
                    data-testid="auth-register-handle"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="displayName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {t('auth.register.name', { defaultValue: 'Name' })}
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="text"
                    placeholder={t('auth.register.namePlaceholder', {
                      defaultValue: 'Name',
                    })}
                    data-testid="auth-register-name"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {t('auth.register.email', { defaultValue: 'Email' })}
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="email"
                    placeholder={t('auth.register.emailPlaceholder', {
                      defaultValue: 'you@email.org',
                    })}
                    data-testid="auth-register-email"
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
                  {t('auth.register.password', { defaultValue: 'Password' })}
                </FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      {...field}
                      type={showPassword ? 'text' : 'password'}
                      data-testid="auth-register-password"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={
                        showPassword
                          ? t('auth.register.hidePassword', {
                              defaultValue: 'Hide password',
                            })
                          : t('auth.register.showPassword', {
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

          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {t('auth.register.confirmPassword', {
                    defaultValue: 'Confirm Password',
                  })}
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="password"
                    data-testid="auth-register-confirm-password"
                  />
                </FormControl>
                <FormMessage data-testid="auth-register-confirm-password-error" />
              </FormItem>
            )}
          />

          {(password ?? '').length > 0 &&
            (confirmPassword ?? '').length === 0 && (
              <div className="bg-surface border-border flex w-full justify-center rounded py-2">
                <p>{getStrengthMessage(calculatePasswordStrength(password))}</p>
              </div>
            )}

          <FormField
            control={form.control}
            name="privacyPolicyAccepted"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center gap-2">
                  <FormControl>
                    <Input
                      type="checkbox"
                      checked={field.value}
                      onChange={(e) => field.onChange(e.target.checked)}
                      data-testid="auth-register-privacy-checkbox"
                    />
                  </FormControl>
                  <p>
                    {t('auth.register.privacyPolicyAgreement', {
                      defaultValue: 'I have read and agree to the',
                    })}{' '}
                    <a
                      href={privacyPolicyLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="anchor text-sm"
                    >
                      {t('auth.register.privacyPolicy', {
                        defaultValue: 'Privacy Policy',
                      })}
                    </a>
                  </p>
                </div>
                <FormMessage data-testid="auth-register-privacy-error" />
              </FormItem>
            )}
          />

          {error && (
            <Toast
              variant="error"
              testId="auth-register-error"
              onDismiss={() => setError(null)}
            >
              {error}
            </Toast>
          )}

          <Button
            type="submit"
            variant="default"
            title={t('auth.register.signUp', { defaultValue: 'Sign Up' })}
            loading={form.formState.isSubmitting}
            data-testid="auth-register-submit"
          >
            {t('auth.register.signUp', { defaultValue: 'Sign Up' })}
          </Button>
        </form>
      </Form>

      {serverInfo.publicContent ? (
        <div className="flex justify-between pt-1">
          <span>
            {t('auth.register.alreadyHaveAccount', {
              defaultValue: 'Already have an account?',
            })}{' '}
            <Link action="/auth/login" className="text-sm">
              {t('auth.register.signIn', { defaultValue: 'Sign In' })}
            </Link>
          </span>
          <RouterLink to="/feeds/local" className="op-anchor text-sm">
            {t('auth.register.seeCommunityFeed', {
              defaultValue: 'See community feed',
            })}
          </RouterLink>
        </div>
      ) : (
        <div className="flex justify-center pt-1">
          <span>
            {t('auth.register.alreadyHaveAccount', {
              defaultValue: 'Already have an account?',
            })}{' '}
            <Link action="/auth/login" className="text-sm">
              {t('auth.register.signIn', { defaultValue: 'Sign In' })}
            </Link>
          </span>
        </div>
      )}
    </AuthLayout>
  );
}
