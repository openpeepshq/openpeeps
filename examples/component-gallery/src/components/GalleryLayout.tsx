import type { ReactElement, ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { ThemeSwitcher } from './ThemeSwitcher';
import { ThemeControls } from './ThemeControls';
import { VersionSwitcher } from './VersionSwitcher';
import { CATEGORY_LABELS, type ShowcaseCategory } from '@/types';

type Props = {
  categories: ShowcaseCategory[];
  versionId: string;
  versionLabel: string;
  children: ReactNode;
};

export const GalleryLayout = ({
  categories,
  versionId,
  versionLabel,
  children,
}: Props): ReactElement => (
  <div className="flex min-h-full flex-col md:flex-row">
    <aside className="border-border bg-background w-full shrink-0 border-b md:h-screen md:w-72 md:overflow-y-auto md:border-b-0 md:border-r">
      <div className="space-y-4 p-4">
        <div>
          <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
            OpenPeeps
          </p>
          <h1 className="text-xl font-semibold">Components</h1>
          <p className="text-muted-foreground mt-1 text-xs">{versionLabel}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ThemeSwitcher />
          <VersionSwitcher currentId={versionId} />
        </div>
        <nav className="flex flex-wrap gap-2 md:flex-col md:gap-1">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `rounded-md px-2 py-1.5 text-sm ${
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted text-foreground'
              }`
            }
          >
            All
          </NavLink>
          {categories.map((category) => (
            <NavLink
              key={category}
              to={`/category/${category}`}
              className={({ isActive }) =>
                `rounded-md px-2 py-1.5 text-sm ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted text-foreground'
                }`
              }
            >
              {CATEGORY_LABELS[category]}
            </NavLink>
          ))}
        </nav>
        <ThemeControls />
      </div>
    </aside>
    <main className="min-w-0 flex-1 p-4 md:p-8">{children}</main>
  </div>
);
