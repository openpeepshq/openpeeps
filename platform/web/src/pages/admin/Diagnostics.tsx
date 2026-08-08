import { useT, useSetPageHeader } from '@openpeeps/react';
import { ConfigMenuButton } from './ConfigMenuButton';

export function AdminDiagnostics() {
  const t = useT();

  useSetPageHeader(t('diagnostics.title', { defaultValue: 'Diagnostics' }));

  return (
    <div className="p-4">
      <ConfigMenuButton
        translationPrefix="diagnostics.email"
        action="/admin/diagnostics/email"
      />
      <ConfigMenuButton
        translationPrefix="diagnostics.logs"
        action="/admin/diagnostics/logs"
      />
      <ConfigMenuButton
        translationPrefix="diagnostics.performance"
        action="/admin/diagnostics/performance"
      />
    </div>
  );
}
