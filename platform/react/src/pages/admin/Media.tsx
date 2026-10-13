import { useMemo, useState } from 'react';
import { Images } from 'lucide-react';
import type {
  StoredMediaFile,
  StoredMediaStatus,
} from '@openpeepshq/common/types';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@openpeepshq/react-ui';
import { useOpenpeeps, useSetPageHeader, useT } from '../../index';

type MediaFilter = 'all' | 'unused' | 'referenced';

const formatBytes = (size: number): string => {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  if (size < 1024 * 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`;
};

const formatWhen = (iso: string | null): string =>
  iso ? new Date(iso).toLocaleString() : '';

export const AdminMedia = () => {
  const t = useT();
  const { openpeepsApi } = useOpenpeeps();
  const mediaQuery = openpeepsApi.admin.useMediaList();
  const deleteMedia = openpeepsApi.admin.deleteMediaAction();
  const [filter, setFilter] = useState<MediaFilter>('all');
  const [query, setQuery] = useState('');
  const [pending, setPending] = useState<StoredMediaFile | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const files = mediaQuery.data?.files ?? [];
  const graceDays = Math.round((mediaQuery.data?.graceMs ?? 0) / 86_400_000);
  const needle = query.trim().toLowerCase();

  const visible = useMemo(
    () =>
      files.filter((file) => {
        if (filter === 'unused' && file.status === 'referenced') return false;
        if (filter === 'referenced' && file.status !== 'referenced') {
          return false;
        }
        return (
          needle.length === 0 || file.storageId.toLowerCase().includes(needle)
        );
      }),
    [files, filter, needle],
  );

  const unusedCount = files.filter(
    (file) => file.status !== 'referenced',
  ).length;

  useSetPageHeader(t('admin.media.title', { defaultValue: 'Media' }));

  const statusLabel = (status: StoredMediaStatus) =>
    t(`admin.media.status.${status}`, {
      defaultValue:
        status === 'referenced'
          ? 'In use'
          : status === 'due'
            ? 'Ready to collect'
            : 'Unused',
    });

  const collectionLabel = (file: StoredMediaFile) => {
    if (file.status === 'referenced') {
      return t('admin.media.collects.referenced', {
        defaultValue: 'Kept — still linked',
      });
    }
    if (file.status === 'pending') {
      return t('admin.media.collects.pending', {
        defaultValue: 'Deletes {{date}}',
        date: formatWhen(file.deletesAt),
      });
    }
    if (file.status === 'due') {
      return t('admin.media.collects.due', {
        defaultValue: 'Deletes on the next run',
      });
    }
    return t('admin.media.collects.unseen', {
      defaultValue: 'Recorded on the next run',
    });
  };

  const confirmDelete = async () => {
    if (!pending) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteMedia({ storageId: pending.storageId });
      setPending(null);
    } catch (error) {
      setDeleteError((error as Error).message);
    } finally {
      setDeleting(false);
    }
  };

  const filters: { id: MediaFilter; label: string }[] = [
    { id: 'all', label: t('admin.media.filter.all', { defaultValue: 'All' }) },
    {
      id: 'unused',
      label: t('admin.media.filter.unused', { defaultValue: 'Unused' }),
    },
    {
      id: 'referenced',
      label: t('admin.media.filter.inUse', { defaultValue: 'In use' }),
    },
  ];

  return (
    <div className="space-y-4 p-4">
      <div className="rounded-md border p-4 text-sm">
        {t('admin.media.description', {
          defaultValue:
            'Removing a post or jam recording leaves the file on the server, because another post, the welcome page, the about page, the code of conduct, a profile, or a custom field may still link to it. Garbage collection deletes a file {{days}} days after it first has no live link. Delete now removes a file immediately.',
          days: graceDays || 7,
        })}
      </div>
      <p className="text-muted-foreground text-sm">
        {t('admin.media.counts', {
          defaultValue:
            '{{total}} files · {{unused}} unused · {{inUse}} in use',
          total: files.length,
          unused: unusedCount,
          inUse: files.length - unusedCount,
        })}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {filters.map((item) => (
          <Button
            key={item.id}
            title={item.label}
            variant={filter === item.id ? 'default' : 'outline'}
            action={() => setFilter(item.id)}
          >
            {item.label}
          </Button>
        ))}
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('admin.media.search', {
            defaultValue: 'Search by file id',
          })}
          className="border-border bg-background min-w-48 flex-1 rounded-md border px-3 py-2 text-sm"
        />
      </div>

      {mediaQuery.isLoading ? (
        <p className="text-muted-foreground text-sm">
          {t('admin.media.loading', { defaultValue: 'Loading…' })}
        </p>
      ) : null}
      {mediaQuery.isError ? (
        <p className="text-error text-sm">
          {t('admin.media.error', {
            defaultValue: 'Could not load media files',
          })}
        </p>
      ) : null}
      {!mediaQuery.isLoading && !mediaQuery.isError && visible.length === 0 ? (
        <div className="text-muted-foreground flex flex-col items-center pt-16">
          <Images size={48} />
          <p className="mt-2 text-sm">
            {t('admin.media.empty', { defaultValue: 'No media files' })}
          </p>
        </div>
      ) : null}
      {visible.length > 0 ? (
        <ul className="space-y-2">
          {visible.map((file) => (
            <li key={file.storageId} className="rounded-md border p-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="break-all font-mono text-xs">
                    {file.storageId}
                  </p>
                  <p className="text-muted-foreground mt-1 text-sm">
                    {formatBytes(file.size)} · {formatWhen(file.modifiedAt)}
                  </p>
                  <p className="mt-1 text-sm">
                    <span className="font-medium">
                      {statusLabel(file.status)}
                    </span>
                    <span className="text-muted-foreground">
                      {' '}
                      · {collectionLabel(file)}
                    </span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary text-sm"
                  >
                    {t('admin.media.open', { defaultValue: 'Open' })}
                  </a>
                  <Button
                    title={t('admin.media.delete', {
                      defaultValue: 'Delete now',
                    })}
                    variant="outline"
                    action={() => {
                      setDeleteError(null);
                      setPending(file);
                    }}
                  >
                    {t('admin.media.delete', { defaultValue: 'Delete now' })}
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {pending ? (
        <Dialog
          open
          onOpenChange={(open) => {
            if (!open && !deleting) setPending(null);
          }}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {t('admin.media.confirm.title', {
                  defaultValue: 'Delete this file?',
                })}
              </DialogTitle>
            </DialogHeader>
            <p className="px-1 text-sm">
              {pending.status === 'referenced'
                ? t('admin.media.confirm.referenced', {
                    defaultValue:
                      'This file is still linked from a post, page, or profile. Deleting it now removes it from the server, and those links will stop working.',
                  })
                : t('admin.media.confirm.unused', {
                    defaultValue:
                      'This file is unused. Deleting it now removes it from the server instead of waiting for garbage collection.',
                  })}
            </p>
            {deleteError ? (
              <p className="border-error/40 text-error rounded-md border p-2 text-sm">
                {deleteError}
              </p>
            ) : null}
            <DialogActions
              cancelLabel={t('admin.media.confirm.cancel', {
                defaultValue: 'Cancel',
              })}
              onCancel={() => setPending(null)}
              actionLabel={t('admin.media.confirm.action', {
                defaultValue: 'Delete file',
              })}
              onAction={confirmDelete}
              disabled={deleting}
            />
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
};
