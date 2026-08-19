import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { Link } from '@openpeepshq/react-ui';
import { useT } from '../index';
import { AuthLayout, useCurrentProfile, useServerInfo } from '../components';

import { Markdown } from '../lib/Markdown';

export function CodeOfConduct() {
  const t = useT();
  const navigate = useNavigate();
  const serverInfo = useServerInfo();
  const currentProfile = useCurrentProfile();

  const source =
    serverInfo.communityConfig?.content?.codeOfConduct ??
    'This community has not published a code of conduct yet.';

  return (
    <AuthLayout noRedirect navigate={(url) => void navigate(url)}>
      <h1 className="h1 pb-4 font-bold">
        {t('codeOfConduct.title', { defaultValue: 'Code of conduct' })}
      </h1>

      <Markdown source={source} />

      {!currentProfile && (
        <div className="flex justify-between px-2 pt-4">
          {serverInfo.communityConfig?.settings?.openRegistrations && (
            <span>
              Don't have an account?{' '}
              <Link action="/auth/register" className="text-sm">
                Sign Up
              </Link>
            </span>
          )}
          {serverInfo.publicContent && (
            <span>
              <RouterLink to="/feeds/local" className="op-anchor text-sm">
                See community feed
              </RouterLink>
            </span>
          )}
        </div>
      )}
    </AuthLayout>
  );
}
