import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@openpeepshq/react-ui';
import { useT } from '../../i18n';
import { useRouter } from '../../contexts/router';

export interface SignUpLoginModalProps {
  onClose: () => void;
}

/**
 * Translation of @openpeepshq/svelte/components/core/accounts/modals/
 * SignUpLoginModal.svelte. Prompts a guest to sign in before performing an
 * action that requires authentication (e.g. replying to a post).
 */
export function SignUpLoginModal({ onClose }: SignUpLoginModalProps) {
  const t = useT();
  const router = useRouter();

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>
            {t('accounts.login.title', { defaultValue: 'Login' })}
          </DialogTitle>
          <DialogDescription>
            {t('accounts.login.description', {
              defaultValue: 'Login to your account',
            })}
          </DialogDescription>
        </DialogHeader>
        <DialogActions
          cancelLabel={t('common.cancel', { defaultValue: 'Cancel' })}
          onCancel={onClose}
          actionLabel={t('accounts.login.loginButton', {
            defaultValue: 'Log In',
          })}
          onAction={() => {
            router.navigate({ type: 'auth', mode: 'login' });
            onClose();
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
