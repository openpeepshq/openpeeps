import { useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Toast } from '@openpeeps/react-ui';
import { useT } from '@openpeeps/react';
import { useCurrentProfile, useServerInfo } from '@openpeeps/react/components';

/**
 * Redirect to `/feeds/local` when the user is signed in or the community has
 * public content, otherwise to `/auth/login`. Surfaces the `?toast=success`
 * notice from the email validation flow as a transient banner.
 */
export function Home() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const serverInfo = useServerInfo();
  const currentProfile = useCurrentProfile();
  const t = useT();

  const toastType = searchParams.get('toast');

  const profileKey = currentProfile?.id ?? '';
  const hasPublic = !!serverInfo.publicContent;
  const target = useMemo(
    () => (profileKey || hasPublic ? '/feeds/local' : '/auth/login'),
    [profileKey, hasPublic],
  );

  useEffect(() => {
    navigate(target, { replace: true });
  }, [target, navigate]);

  if (toastType === 'success') {
    return (
      <Toast variant="success">
        {t('auth.email.validation.success', {
          defaultValue: 'Email validated.',
        })}
      </Toast>
    );
  }

  return null;
}
