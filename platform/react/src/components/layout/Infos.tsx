import { useState } from 'react';
import { Button } from '@openpeepshq/react-ui';
import { canCreatePostType } from '@openpeepshq/common';
import { useAuthData, useIdentity } from './IdentityContext';
import { useOpenpeeps } from '../../contexts/openpeeps';
import { useT } from '../../i18n';

/**
 * Translation of @openpeepshq/svelte/components/layout/Infos.svelte — renders
 * the "verify your email" warning when the current account/profile applies.
 */
export function Infos() {
  const { profile, account } = useIdentity();
  const authData = useAuthData();
  const t = useT();
  const { openpeepsApi } = useOpenpeeps();
  const validateEmail = openpeepsApi.validationEmailAction();
  const [status, setStatus] = useState<
    'idle' | 'pending' | 'success' | 'error'
  >('idle');

  const showEmailWarning =
    !!account &&
    !!profile &&
    !account.emailValidated &&
    !canCreatePostType(authData, 'note');

  if (!showEmailWarning) return <div className="flex flex-col gap-4" />;

  const handleValidate = async () => {
    setStatus('pending');
    try {
      await validateEmail();
      setStatus('success');
    } catch {
      setStatus('error');
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="border-error bg-error/10 flex w-full items-start justify-between gap-4 rounded border p-4">
        <div>
          <h4 className="text-error font-semibold">
            {t('infos.emailNotVerified.title')}
          </h4>
          <p>{t('infos.emailNotVerified.text')}</p>
          {status === 'success' ? (
            <p className="text-success mt-2 text-sm">
              {t('accounts.validateEmail.success', {
                defaultValue: 'Verification email sent.',
              })}
            </p>
          ) : null}
          {status === 'error' ? (
            <p className="text-error mt-2 text-sm">
              {t('accounts.validateEmail.error', {
                defaultValue: 'Could not send verification email.',
              })}
            </p>
          ) : null}
        </div>
        <Button
          action={handleValidate}
          variant="ghost"
          disabled={status === 'pending'}
        >
          {status === 'pending'
            ? t('common.sending', { defaultValue: 'Sending…' })
            : t('infos.emailNotVerified.verify')}
        </Button>
      </div>
    </div>
  );
}
