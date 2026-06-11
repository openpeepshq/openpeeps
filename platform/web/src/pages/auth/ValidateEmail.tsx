import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useT } from '@openpeeps/react';
import { AuthLayout, useToast } from '@openpeeps/react/components';

const baseUrl =
  import.meta.env.VITE_OPENPEEPS_BASE_URL ??
  (typeof window !== 'undefined' ? window.location.origin : '');

/**
 * SPA handler for the `/auth/validate-email?token=...` email link. Mirrors the
 * SvelteKit server route: it calls the backend validation endpoint and, on
 * success, sends the user home with a confirmation toast. The endpoint replies
 * with a redirect on success and a 4xx on an invalid/expired token.
 */
export function ValidateEmail() {
  const t = useT();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { success, error: toastError } = useToast();
  const [failed, setFailed] = useState(false);
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    const fail = () => {
      setFailed(true);
      toastError(
        t('auth.emails.validation.error', {
          defaultValue: 'This verification link is invalid or has expired.',
        }),
      );
    };

    const token = searchParams.get('token');
    if (!token) {
      fail();
      return;
    }

    void (async () => {
      try {
        const res = await fetch(
          `${baseUrl}/auth/validate-email?token=${encodeURIComponent(token)}`,
        );
        if (!res.ok) throw new Error('validation failed');
        success(
          t('auth.emails.validation.success', {
            defaultValue:
              'Your email is now verified. You may fully participate in the community.',
          }),
        );
        navigate('/');
      } catch {
        fail();
      }
    })();
  }, [searchParams, navigate, success, toastError, t]);

  return (
    <AuthLayout navigate={navigate} noRedirect>
      <div className="text-token variant-glass flex h-fit flex-col items-center justify-center space-y-4 p-4 md:w-96">
        {failed ? (
          <>
            <h2 className="text-lg font-bold">
              {t('auth.emails.validation.errorHeading', {
                defaultValue: 'Verification failed',
              })}
            </h2>
            <p className="text-center">
              {t('auth.emails.validation.error', {
                defaultValue:
                  'This verification link is invalid or has expired.',
              })}
            </p>
          </>
        ) : (
          <p className="text-center">
            {t('auth.emails.validation.loading', {
              defaultValue: 'Verifying your email…',
            })}
          </p>
        )}
      </div>
    </AuthLayout>
  );
}
