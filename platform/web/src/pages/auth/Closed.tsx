import { useNavigate } from 'react-router-dom';
import { Button } from '@openpeeps/react-ui';
import { useT } from '@openpeeps/react';
import { AuthLayout } from '@openpeeps/react/components';

export function AuthClosed() {
  const t = useT();
  const navigate = useNavigate();

  return (
    <AuthLayout navigate={navigate} noRedirect>
      <div className="text-token variant-glass flex h-fit flex-col items-center justify-center space-y-4 p-4 md:w-96">
        <h2 className="text-lg font-bold">
          {t('auth.signUpsClosed', {
            defaultValue: 'Sign Ups are Currently Closed',
          })}
        </h2>
        <p className="text-center">
          {t('auth.signUpsClosedBody', {
            defaultValue:
              'We are not accepting new registrations at this time. Please check back later or contact support if you believe this is an error.',
          })}
        </p>

        <Button
          title="Go to Login"
          action={() => navigate('/auth/login')}
          variant="variant-filled-primary"
          className="mt-4 w-full"
        >
          {t('auth.goToLogin', { defaultValue: 'Go to Login' })}
        </Button>
      </div>
    </AuthLayout>
  );
}
