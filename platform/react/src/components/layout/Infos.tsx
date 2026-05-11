import { Button } from '@openpeeps/react-ui';
import { canCreatePostType } from '@openpeeps/common';
import { useIdentity } from './IdentityContext';
import { useT } from '../../i18n';

export interface InfosProps {
  /** Optional callback wired to the Validate button. */
  onValidateEmail?: () => Promise<void> | void;
}

/**
 * Translation of @openpeeps/svelte/components/layout/Infos.svelte — renders
 * the "verify your email" warning when the current account/profile applies.
 *
 * The Svelte version called `validateEmailAction` and `toaster` from the
 * platform module directly. Here we accept the action as a prop so consumers
 * can wire their own toast/error handling.
 */
export function Infos({ onValidateEmail }: InfosProps = {}) {
  const { profile, account } = useIdentity();
  const t = useT();

  const showEmailWarning =
    !!account &&
    !!profile &&
    !account.emailValidated &&
    !canCreatePostType(profile, 'note');

  if (!showEmailWarning) return <div className="flex flex-col gap-4" />;

  return (
    <div className="flex flex-col gap-4">
      <div className="border-error bg-error/10 flex w-full items-start justify-between gap-4 rounded border p-4">
        <div>
          <h4 className="text-error font-semibold">
            {t('infos.emailNotVerified.title')}
          </h4>
          <p>{t('infos.emailNotVerified.text')}</p>
        </div>
        {onValidateEmail && (
          <Button
            action={() =>
              Promise.resolve(onValidateEmail()).then(() => undefined)
            }
            variant="variant-ghost-primary"
          >
            {t('infos.emailNotVerified.verify')}
          </Button>
        )}
      </div>
    </div>
  );
}
