import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@openpeeps/react-ui';
import { useT } from '../../i18n';
import { useRouter } from '../../contexts/router';

export interface SignUpLoginModalProps {
  onClose: () => void;
}

/**
 * Translation of @openpeeps/svelte/components/core/accounts/modals/
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
        <DialogFooter>
          <Button variant="variant-ringed-surface" action={onClose}>
            {t('common.cancel', { defaultValue: 'Cancel' })}
          </Button>
          <Button
            variant="variant-filled-primary"
            action={() => {
              router.navigate('/auth/login');
              onClose();
            }}
          >
            {t('accounts.login.loginButton', { defaultValue: 'Log In' })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
