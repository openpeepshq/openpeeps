import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { Link } from '@openpeepshq/react-ui';
import { useT, useHrefOf } from '../index';
import { AuthLayout } from '../components';
import { useCommunityInfoPages } from '../hooks';

import { Markdown } from '../lib/Markdown';

export function About() {
  const t = useT();
  const navigate = useNavigate();
  const hrefOf = useHrefOf();
  const {
    communityName,
    aboutPage,
    showVisitorLinks,
    openRegistrations,
    publicContent,
  } = useCommunityInfoPages();

  return (
    <AuthLayout noRedirect navigate={(url) => void navigate(url)}>
      <h1 className="h1 pb-4 font-bold">
        {t('about.welcomeTo', {
          defaultValue: `Welcome to ${communityName}`,
          name: communityName,
        })}
      </h1>

      <Markdown source={aboutPage} />

      {showVisitorLinks && (
        <div className="flex justify-between px-2 pt-4">
          {openRegistrations && (
            <span>
              Don't have an account?{' '}
              <Link action="/auth/register" className="text-sm">
                Sign Up
              </Link>
            </span>
          )}
          {publicContent && (
            <span>
              <RouterLink
                to={hrefOf({ type: 'welcome' })}
                className="op-anchor text-sm"
              >
                {t('auth.register.exploreCommunity', {
                  defaultValue: 'Explore the community',
                })}
              </RouterLink>
            </span>
          )}
        </div>
      )}
    </AuthLayout>
  );
}
