import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { getTheme } from '@openpeepshq/common';
import { useServerInfo } from '@openpeepshq/react/components';
import { DocSearch } from './DocSearch';

const navSeparator = (
  <>
    <span className="inline-block w-5" aria-hidden />
    |
    <span className="inline-block w-5" aria-hidden />
  </>
);

export const DocsLayout = ({ children }: { children: ReactNode }) => {
  const serverInfo = useServerInfo();
  const logoSmall = serverInfo.communityConfig
    ? getTheme(serverInfo.communityConfig).logoSmall
    : undefined;

  return (
    <div className="bg-background min-h-full">
      <header className="border-border bg-surface border-b px-4 py-3 md:px-6">
        <div className="flex flex-wrap items-center gap-3">
          <nav className="flex flex-wrap items-center gap-y-2 text-sm">
            {logoSmall ? (
              <Link to="/">
                <img src={logoSmall} alt="logo" className="h-5" />
              </Link>
            ) : (
              <Link to="/" className="op-anchor">
                &lt; Back to Community
              </Link>
            )}
            {navSeparator}
            <Link to="/docs" className="op-anchor">
              Documentation Home
            </Link>
            {navSeparator}
            <Link to="/docs/user" className="op-anchor">
              Using AllPeep
            </Link>
            {navSeparator}
            <Link to="/docs/admin" className="op-anchor">
              Administration
            </Link>
            {navSeparator}
            <Link to="/docs/development" className="op-anchor">
              Developers
            </Link>
          </nav>
          <div className="ml-auto w-full sm:w-auto sm:min-w-[14rem]">
            <DocSearch />
          </div>
        </div>
      </header>
      <main className="px-10 py-6">{children}</main>
    </div>
  );
};
