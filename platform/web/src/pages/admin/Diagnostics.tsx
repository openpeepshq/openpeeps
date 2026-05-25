import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useT, useSetPageHeader } from '@openpeeps/react';

const links = [
  { to: '/admin/diagnostics/email', labelKey: 'diagnostics.email.title', fallback: 'Email queue' },
  { to: '/admin/diagnostics/logs', labelKey: 'diagnostics.logs.title', fallback: 'Logs' },
];

export function AdminDiagnostics() {
  const t = useT();

  useSetPageHeader(t('diagnostics.title', { defaultValue: 'Diagnostics' }));

  return (
    <div className="space-y-4 p-4">
      <nav className="grid gap-1">
        {links.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className="hover:bg-surface-100 flex items-center justify-between rounded-md border px-4 py-3 text-sm"
          >
            <span>{t(link.labelKey, { defaultValue: link.fallback })}</span>
            <ChevronRight className="size-4 opacity-60" />
          </Link>
        ))}
      </nav>
    </div>
  );
}
