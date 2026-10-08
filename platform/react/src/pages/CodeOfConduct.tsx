import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { Link } from '@openpeepshq/react-ui';
import { useT } from '../index';
import { AuthLayout } from '../components';
import { useCommunityInfoPages } from '../hooks';

import { Markdown } from '../lib/Markdown';

export function CodeOfConduct() {
  const t = useT();
  const navigate = useNavigate();
  const {
    codeOfConduct: source,
    showVisitorLinks,
    openRegistrations,
    publicContent,
  } = useCommunityInfoPages();

  return (
    <AuthLayout noRedirect navigate={(url) => void navigate(url)}>
      <h1 className="h1 pb-4 font-bold">
        {t('codeOfConduct.title', { defaultValue: 'Code of conduct' })}
      </h1>

      <Markdown source={source} />

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
