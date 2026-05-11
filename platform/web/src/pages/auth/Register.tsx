import { useEffect, useState } from 'react';
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { z } from 'zod';
import {
  registerRequestSchema,
  type RegisterRequest,
} from '@openpeeps/common/types';
import {
  Form,
  FormInput,
  Link,
  SubmitButton,
} from '@openpeeps/react-ui';
import { useT, useOpenpeeps, useCredentialsStore } from '@openpeeps/react';
import { AuthLayout, useServerInfo } from '@openpeeps/react/components';

import { performRegister } from '../../lib/auth';
import {
  calculatePasswordStrength,
  getStrengthMessage,
} from '../../lib/passwordStrength';

export interface RegisterProps {
  invite?: boolean;
}

const registerFormSchema = (registerRequestSchema as unknown as z.ZodObject<
  Record<string, z.ZodTypeAny>
>)
  .refine(
    (d: Record<string, unknown>) => d.password === d.confirmPassword,
    {
      message: 'Passwords do not match',
      path: ['confirmPassword'],
    },
  )
  .refine((d: Record<string, unknown>) => d.privacyPolicyAccepted, {
    message: 'You must agree to the privacy policy',
    path: ['privacyPolicyAccepted'],
  });

export function Register({ invite = false }: RegisterProps) {
  const t = useT();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { client } = useOpenpeeps();
  const { credentialsStore } = useCredentialsStore();
  const serverInfo = useServerInfo();

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

  const privacyPolicyLink =
    serverInfo.communityConfig?.info?.privacyPolicy ?? '/docs/privacy';
  const stripeMembershipEnabled =
    !!serverInfo.payments?.stripe?.paidMembership?.enabled;

  const handleSubmit = async () => {
    setError(null);
    try {
      await performRegister(client, credentialsStore, data);
      if (stripeMembershipEnabled) {
        // TODO: wire createCheckoutMutation when payments hooks are ported.
        navigate('/welcome');
      } else {
        navigate('/welcome');
      }
    } catch (err) {
      setError(t((err as Error).message));
    }
  };

  return (
    <AuthLayout navigate={navigate}>
      <Form data={data} schema={registerFormSchema as unknown as z.ZodType<RegisterRequest>}>
        <h2 className="text-xl">
          {t('auth.createAccount', { defaultValue: 'Create account' })}
        </h2>

        {invite && (
          <p className="my-2">
            You’ve been invited to join{' '}
            {serverInfo.communityConfig?.info?.name},
            enter details below to be a part of the community.
          </p>
        )}

        <FormInput
          description={t('common.handle', { defaultValue: 'Handle' })}
          type="text"
          placeholder="Handle"
          path={['handle']}
        />

        <FormInput
          description={t('common.name', { defaultValue: 'Name' })}
          type="text"
          placeholder="Name"
          path={['displayName']}
        />

        <FormInput
          description={t('common.email', { defaultValue: 'Email' })}
          type="email"
          placeholder="you@email.org"
          path={['email']}
        />

        <FormInput
          path={['password']}
          description={t('common.password', { defaultValue: 'Password' })}
          type={showPassword ? 'text' : 'password'}
          tail={
            <button
              type="button"
              className="m-0 !p-0"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          }
        />

        <FormInput
          description={t('common.confirmPassword', {
            defaultValue: 'Confirm Password',
          })}
          type="password"
          path={['confirmPassword']}
        />

        {(data.password ?? '').length > 0 &&
          (data.confirmPassword ?? '').length === 0 && (
            <div className="bg-surface-300 border-surface-100 flex w-full justify-center rounded py-2">
              <p>{getStrengthMessage(calculatePasswordStrength(data.password))}</p>
            </div>
          )}

        <span className="flex w-full items-center justify-start">
          <FormInput
            description=""
            type="checkbox"
            path={['privacyPolicyAccepted']}
          />
          <p className="ml-4">
            I have read and agree to the
            <a
              href={privacyPolicyLink}
              target="_blank"
              rel="noopener noreferrer"
              className="anchor w-full px-4 text-sm"
            >
              Privacy Policy
            </a>
          </p>
        </span>

        {error && (
          <p className="text-error rounded-md border border-error/40 p-2 text-sm">
            {error}
          </p>
        )}

        <SubmitButton action={handleSubmit} title="Sign Up">
          {t('auth.signUp', { defaultValue: 'Sign Up' })}
        </SubmitButton>
      </Form>

      {serverInfo.publicContent ? (
        <div className="flex justify-between pt-1">
          <span>
            Already have an account?{' '}
            <Link action="/auth/login" className="text-sm">
              Sign In
            </Link>
          </span>
          <RouterLink to="/feeds/local" className="op-anchor text-sm">
            See community feed
          </RouterLink>
        </div>
      ) : (
        <div className="flex justify-center pt-1">
          <span>
            Already have an account?{' '}
            <Link action="/auth/login" className="text-sm">
              Sign In
            </Link>
          </span>
        </div>
      )}
    </AuthLayout>
  );
}
