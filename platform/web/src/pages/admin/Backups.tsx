import { useMemo, useState } from 'react';
import { Database, Download, FlaskConical } from 'lucide-react';
import { useT, useOpenpeeps, useSetPageHeader } from '@openpeeps/react';
import { Button } from '@openpeeps/react-ui';
import { RestoreBackupModal } from './components/RestoreBackupModal';
import { RestoreTestBackupModal } from './components/RestoreTestBackupModal';

const downloadBase =
  import.meta.env.VITE_OPENPEEPS_BASE_URL ??
  (typeof window !== 'undefined' ? window.location.origin : '');

export function AdminBackups() {
  const t = useT();
  const { openpeepsApi } = useOpenpeeps();
  const backupsQuery = openpeepsApi.admin.useBackupsList();
  const createBackup = openpeepsApi.admin.createBackupAction();
  const [showRestore, setShowRestore] = useState(false);
  const [showTestRestore, setShowTestRestore] = useState(false);

  const backups = backupsQuery.data ?? [];

  const createLabel = t('admin.backups.create', {
    defaultValue: 'Create backup',
  });
  const restoreLabel = t('admin.backups.restoreTitle', {
    defaultValue: 'Restore a backup',
  });
  const headerActions = useMemo(
    () => (
      <div className="flex items-center gap-2">
        <Button
          title={restoreLabel}
          variant="variant-ringed-primary"
          action={() => setShowRestore(true)}
        >
          {restoreLabel}
        </Button>
        <Button
          title={createLabel}
          variant="variant-filled-primary"
          action={() => createBackup()}
        >
          {createLabel}
        </Button>
      </div>
    ),
    [createBackup, createLabel, restoreLabel],
  );

  useSetPageHeader(
    t('admin.backups.title', { defaultValue: 'Backups' }),
    headerActions,
  );

  return (
    <div className="p-4">
      {showRestore ? (
        <RestoreBackupModal onClose={() => setShowRestore(false)} />
      ) : null}
      {showTestRestore ? (
        <RestoreTestBackupModal onClose={() => setShowTestRestore(false)} />
      ) : null}

      <div className="mb-2 flex justify-end">
        <Button
          title={t('admin.backups.testBackup', { defaultValue: 'Test backup' })}
          variant="variant-ghost-primary"
          action={() => setShowTestRestore(true)}
        >
          <FlaskConical size={18} />
          {t('admin.backups.testBackup', { defaultValue: 'Test backup' })}
        </Button>
      </div>

      <div className="mb-2 rounded-md border-2 p-4">
        {t('admin.backups.description', {
          defaultValue:
            'All backups are stored in the server temporarily. Please download the backups and store them in a safe place. You can restore the backups by uploading them here.',
        })}
      </div>

      {backups.length === 0 ? (
        <div className="text-muted-foreground flex flex-col items-center pt-20">
          <Database size={50} />
          <p className="mt-2 text-sm">
            {t('admin.backups.noBackupsFound', {
              defaultValue: 'No Backups found',
            })}
          </p>
        </div>
      ) : (
        <ul className="space-y-1 rounded-md border p-2 font-mono text-sm">
          {[...backups].reverse().map((name) => (
            <li
              key={name}
              className="flex items-center justify-between border-b px-2 py-1 last:border-b-0"
            >
              <span>{name}</span>
              <a
                title={t('common.actions.download', {
                  defaultValue: 'Download',
                })}
                download
                href={`${downloadBase}/backups/${name}.zip`}
                className="hover:text-primary"
              >
                <Download size={18} />
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
