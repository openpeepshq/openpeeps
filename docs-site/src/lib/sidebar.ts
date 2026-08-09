export type NavItem = {
  label: string;
  slug: string;
};

export type NavSection = {
  title: string;
  items: NavItem[];
};

/** Sidebar aligned with DocsLayout sections + known doc tree. */
export const SIDEBAR: NavSection[] = [
  {
    title: 'Overview',
    items: [
      { label: 'Home', slug: '' },
      { label: 'Glossary', slug: 'glossary' },
      { label: 'Privacy', slug: 'privacy' },
    ],
  },
  {
    title: 'Using AllPeep',
    items: [
      { label: 'Overview', slug: 'user' },
      { label: 'Markdown', slug: 'user/markdown' },
    ],
  },
  {
    title: 'Administration',
    items: [
      { label: 'Overview', slug: 'admin' },
      { label: 'Backups', slug: 'admin/backups' },
      { label: 'OIDC SSO', slug: 'admin/oidc-sso' },
      { label: 'Generic SSO', slug: 'admin/generic-sso' },
      { label: 'Subscriptions', slug: 'admin/payments/subscriptions' },
      { label: 'Release notes', slug: 'admin/release-notes' },
    ],
  },
  {
    title: 'Developers',
    items: [
      { label: 'Overview', slug: 'development' },
      { label: 'General principles', slug: 'development/general-principles' },
      { label: 'Code style', slug: 'development/code-style' },
      { label: 'Data storage', slug: 'development/data-storage' },
      { label: 'Notifications', slug: 'development/notifications' },
      { label: 'Plugins', slug: 'development/plugins' },
      { label: 'Routes', slug: 'development/routes' },
      { label: 'Architecture', slug: 'development/architecture' },
      { label: 'Backend', slug: 'development/architecture/backend' },
      { label: 'Frontend', slug: 'development/architecture/frontend' },
      {
        label: 'Primary web interface',
        slug: 'development/architecture/frontend/primary-web-interface',
      },
      { label: 'Realtime', slug: 'development/architecture/realtime' },
    ],
  },
];

export const slugToPath = (slug: string): string =>
  slug === '' ? '/' : `/${slug}`;
