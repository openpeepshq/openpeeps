import { useMemo } from 'react';
import { Database } from 'lucide-react';
import { useT, useOpenpeeps, useSetPageHeader } from '@openpeeps/react';
import { Button } from '@openpeeps/react-ui';

export function AdminBackups() {
  const t = useT();
  const { openpeepsApi } = useOpenpeeps();
  const backupsQuery = openpeepsApi.admin.useBackupsList();
  const createBackup = openpeepsApi.admin.createBackupAction();

  const backups = backupsQuery.data ?? [];

  const createLabel = t('admin.backups.create', {
    defaultValue: 'Create backup',
  });
  const headerActions = useMemo(
    () => (
      <Button
        title={createLabel}
        variant="variant-filled-primary"
        action={() => createBackup()}
      >
        {createLabel}
      </Button>
    ),
    [createBackup, createLabel],
  );

  useSetPageHeader(
    t('admin.backups.title', { defaultValue: 'Backups' }),
    headerActions,
  );

  return (
    <div className="p-4">
      {backups.length === 0 ? (
        <div className="flex flex-col items-center pt-20 text-muted-foreground">
          <Database size={50} />
          <p className="mt-2 text-sm">
            {t('admin.backups.empty', { defaultValue: 'No backups yet' })}
          </p>
        </div>
      ) : (
        <ul className="space-y-1 rounded-md border p-2 font-mono text-sm">
          {backups.map((name) => (
            <li
              key={name}
              className="flex items-center justify-between border-b px-2 py-1 last:border-b-0"
            >
              <span>{name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
