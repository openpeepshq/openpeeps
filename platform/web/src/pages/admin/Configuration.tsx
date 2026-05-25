import { Link } from 'react-router-dom';
import { useT } from '@openpeeps/react';

const links: { to: string; label: string }[] = [
  { to: '/admin/configuration/server-settings', label: 'Server settings' },
  { to: '/admin/configuration/i18n', label: 'Translations (i18n)' },
  { to: '/admin/configuration/email', label: 'Email (SMTP test)' },
  { to: '/admin/configuration/community', label: 'Community' },
];

const communityLinks: { to: string; label: string }[] = [
  { to: '/admin/configuration/community/info', label: 'Info' },
  { to: '/admin/configuration/community/language', label: 'Default language' },
  { to: '/admin/configuration/community/favicons', label: 'Favicons' },
  { to: '/admin/configuration/community/theme', label: 'Theme' },
  { to: '/admin/configuration/community/profile-fields', label: 'Profile fields' },
  { to: '/admin/configuration/community/welcome-page', label: 'Welcome page' },
  { to: '/admin/configuration/community/about-page', label: 'About page' },
  { to: '/admin/configuration/community/code-of-conduct', label: 'Code of conduct' },
  { to: '/admin/configuration/community/welcome-email', label: 'Welcome email' },
  { to: '/admin/configuration/community/links', label: 'Links' },
  { to: '/admin/configuration/community/roles', label: 'Roles' },
];

export function AdminConfiguration() {
  const t = useT();
  return (
    <div className="space-y-6 p-4">
      <h1 className="text-2xl font-semibold" data-testid="admin-configuration-heading">
        {t('admin.configuration.title', { defaultValue: 'Configuration' })}
      </h1>

      <section>
        <h2 className="mb-2 text-lg font-medium">General</h2>
        <nav className="grid gap-1">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="rounded-md border px-3 py-2 text-sm hover:bg-surface-100"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-medium">Community</h2>
        <nav className="grid gap-1 sm:grid-cols-2">
          {communityLinks.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="rounded-md border px-3 py-2 text-sm hover:bg-surface-100"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </section>
    </div>
  );
}
