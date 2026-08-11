import type { ReactElement, ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { DocSearch } from '@/components/DocSearch';
import { VersionSwitcher } from '@/components/VersionSwitcher';
import { SIDEBAR, slugToPath } from '@/lib/sidebar';
import type { DocEntry } from '@/types';

type Props = {
  children: ReactNode;
  docs: DocEntry[];
  versionId: string;
  versionLabel: string;
};

const linkClass = ({ isActive }: { isActive: boolean }) =>
  [
    'block rounded-md px-2 py-1 text-sm',
    isActive
      ? 'bg-surface-primary text-primary font-medium'
      : 'text-foreground/80 hover:bg-surface',
  ].join(' ');

export const DocsLayout = ({
  children,
  docs,
  versionId,
  versionLabel,
}: Props): ReactElement => (
  <div className="bg-background flex min-h-full flex-col">
    <header className="border-border bg-surface sticky top-0 z-10 border-b">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3 md:px-6">
        <Link to="/" className="flex items-center gap-2">
          <img src={`${import.meta.env.BASE_URL}logo-small.png`} alt="" className="h-6" />
          <span className="text-foreground font-semibold">OpenPeeps Docs</span>
        </Link>
        <VersionSwitcher currentId={versionId} />
        <span className="text-muted-foreground hidden text-xs sm:inline">
          {versionLabel}
        </span>
        <div className="ml-auto w-full sm:w-auto sm:min-w-[14rem]">
          <DocSearch docs={docs} />
        </div>
      </div>
      <nav className="border-border text-muted-foreground mx-auto flex max-w-6xl flex-wrap gap-x-3 gap-y-1 border-t px-4 py-2 text-sm md:px-6">
        <NavLink to="/" end className={linkClass}>
          Home
        </NavLink>
        <NavLink to="/user" className={linkClass}>
          Using AllPeep
        </NavLink>
        <NavLink to="/admin" className={linkClass}>
          Administration
        </NavLink>
        <NavLink to="/development" className={linkClass}>
          Developers
        </NavLink>
      </nav>
    </header>

    <div className="mx-auto flex w-full max-w-6xl flex-1 gap-8 px-4 py-6 md:px-6">
      <aside className="border-border hidden w-56 shrink-0 border-r pr-4 md:block">
        <nav className="sticky top-28 space-y-4">
          {SIDEBAR.map((section) => (
            <div key={section.title}>
              <div className="text-muted-foreground mb-1 text-xs font-semibold uppercase tracking-wide">
                {section.title}
              </div>
              <ul className="space-y-0.5">
                {section.items.map((item) => (
                  <li key={item.slug || 'home'}>
                    <NavLink
                      to={slugToPath(item.slug)}
                      end={item.slug === ''}
                      className={linkClass}
                    >
                      {item.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </aside>
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  </div>
);
