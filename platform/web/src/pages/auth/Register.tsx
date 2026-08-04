import { useEffect, useMemo, useState } from 'react';
import {
  Link as RouterLink,
  useNavigate,
  useSearchParams,
} from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { z } from 'zod';
import {
  registerRequestSchema,
  type RegisterRequest,
} from '@openpeepshq/common/types';
import {
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
  (
    registerRequestSchema as unknown as z.ZodObject<
      Record<string, z.ZodTypeAny>
    >
  )
    .refine((d: Record<string, unknown>) => d.password === d.confirmPassword, {
      message: t('auth.register.passwordsDoNotMatch', {
        defaultValue: 'Passwords do not match',
      }),
      path: ['confirmPassword'],
    })
    .refine((d: Record<string, unknown>) => d.privacyPolicyAccepted, {
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

  const [data] = useState<RegisterRequest>(() => ({
    email: '',
    handle: '',
    displayName: '',
    password: '',
    privacyPolicyAccepted: false,
    confirmPassword: '',
  }));
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const inviteCode = searchParams.get('inviteCode');
    if (inviteCode) data.inviteCode = inviteCode;
  }, [searchParams, data]);

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

  const handleSubmit = async () => {
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
  };

  return (
    <AuthLayout navigate={navigate} hasPayment={!!paymentParam}>
      <Form
        data={data}
        schema={registerFormSchema as unknown as z.ZodType<RegisterRequest>}
      >
        <h2 className="text-xl">
          {t('auth.register.createAccount', { defaultValue: 'Create account' })}
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

        <FormInput
          description={t('auth.register.handle', { defaultValue: 'Handle' })}
          type="text"
          placeholder={t('auth.register.handlePlaceholder', {
            defaultValue: 'Handle',
          })}
          path={['handle']}
          testId="auth-register-handle"
        />

        <FormInput
          description={t('auth.register.name', { defaultValue: 'Name' })}
          type="text"
          placeholder={t('auth.register.namePlaceholder', {
            defaultValue: 'Name',
          })}
          path={['displayName']}
          testId="auth-register-name"
        />

        <FormInput
          description={t('auth.register.email', { defaultValue: 'Email' })}
          type="email"
          placeholder={t('auth.register.emailPlaceholder', {
            defaultValue: 'you@email.org',
          })}
          path={['email']}
          testId="auth-register-email"
        />

        <FormInput
          path={['password']}
          description={t('auth.register.password', {
            defaultValue: 'Password',
          })}
          type={showPassword ? 'text' : 'password'}
          testId="auth-register-password"
          tail={
            <button
              type="button"
              className="m-0 !p-0"
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
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          }
        />

        <FormInput
          description={t('auth.register.confirmPassword', {
            defaultValue: 'Confirm Password',
          })}
          type="password"
          path={['confirmPassword']}
          testId="auth-register-confirm-password"
        />

        {(data.password ?? '').length > 0 &&
          (data.confirmPassword ?? '').length === 0 && (
            <div className="bg-muted border-border flex w-full justify-center rounded py-2">
              <p>
                {getStrengthMessage(calculatePasswordStrength(data.password))}
              </p>
            </div>
          )}

        <FormInput
          type="checkbox"
          path={['privacyPolicyAccepted']}
          testId="auth-register-privacy-checkbox"
        >
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
        </FormInput>

        {error && (
          <Toast variant="error" onDismiss={() => setError(null)}>
            {error}
          </Toast>
        )}

        <SubmitButton
          action={handleSubmit}
          title={t('auth.register.signUp', { defaultValue: 'Sign Up' })}
          testId="auth-register-submit"
        >
          {t('auth.register.signUp', { defaultValue: 'Sign Up' })}
        </SubmitButton>
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
