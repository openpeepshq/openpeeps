import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { Link } from '@openpeepshq/react-ui';
import { useT } from '../index';
import { AuthLayout, useCurrentProfile, useServerInfo } from '../components';

import { Markdown } from '../lib/Markdown';

export function About() {
  const t = useT();
  const navigate = useNavigate();
  const serverInfo = useServerInfo();
  const currentProfile = useCurrentProfile();

  const communityName = serverInfo.communityConfig?.info?.name ?? 'AllPeep';
  const aboutPage =
    serverInfo.communityConfig?.content?.aboutPage ??
    'This is a community hosted on AllPeep.';

  return (
    <AuthLayout noRedirect navigate={(url) => void navigate(url)}>
      <h1 className="h1 pb-4 font-bold">
        {t('about.welcomeTo', {
          defaultValue: `Welcome to ${communityName}`,
          name: communityName,
        })}
      </h1>

      <Markdown source={aboutPage} />

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
