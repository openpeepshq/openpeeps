import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users } from 'lucide-react';
import { groupName } from '@openpeepshq/common/lib';
import type { AdminGroup } from '@openpeepshq/common/types';
import { useT, useOpenpeeps, useSetPageHeader } from '@openpeepshq/react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
} from '@openpeepshq/react-ui';
import { AdminGroupCard } from './components/AdminGroupCard';

export function AdminGroups() {
  const t = useT();
  const navigate = useNavigate();
  const { openpeepsApi } = useOpenpeeps();
  const groupsQuery = openpeepsApi.admin.useAllGroupsList();
  const [search, setSearch] = useState('');
  const [toDelete, setToDelete] = useState<AdminGroup | null>(null);

  const createLabel = t('groups.create.title', {
    defaultValue: 'Create Group',
  });
  const headerActions = useMemo(
    () => (
      <Button
        title={createLabel}
        variant="variant-filled-primary"
        action={() => navigate('/groups/new')}
      >
        {createLabel}
      </Button>
    ),
    [createLabel, navigate],
  );

  useSetPageHeader(
    t('admin.groups.title', { defaultValue: 'Groups' }),
    headerActions,
  );

  const groups = groupsQuery.data ?? [];
  const filtered = search
    ? groups.filter((g) => {
        const q = search.toLowerCase();
        return (
          g.handle.toLowerCase().includes(q) ||
          (g.displayName ?? '').toLowerCase().includes(q)
        );
      })
    : groups;

  return (
    <div className="p-4">
      <div className="mb-4">
        <Input
          placeholder={t('groups.searchPlaceholder', {
            defaultValue: 'Search by group name',
          })}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-muted-foreground flex flex-col items-center gap-3 py-20">
          <Users size={48} />
          <p>
            {search
              ? t('groups.noGroupsFound', { defaultValue: 'No groups found' })
              : t('groups.noGroupsYet', { defaultValue: 'No groups yet' })}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((g) => (
            <AdminGroupCard key={g.id} group={g} onDelete={setToDelete} />
          ))}
        </div>
      )}

      {toDelete ? (
        <DeleteGroupModal group={toDelete} onClose={() => setToDelete(null)} />
      ) : null}
    </div>
  );
}

function DeleteGroupModal({
  group,
  onClose,
}: {
  group: AdminGroup;
  onClose: () => void;
}) {
  const t = useT();
  const { openpeepsApi } = useOpenpeeps();
  const deleteGroup = openpeepsApi.admin.deleteGroupAction();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await deleteGroup({ groupId: group.id });
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {t('admin.groups.deleteTitle', { defaultValue: 'Delete group' })}
          </DialogTitle>
        </DialogHeader>
        <p className="px-1 text-sm">
          {t('admin.groups.deleteDescription', {
            defaultValue:
              'Are you sure you want to delete this group? This action cannot be undone.',
            name: groupName(group),
          })}
        </p>
        {error ? (
          <p className="border-error/40 text-error rounded-md border p-2 text-sm">
            {error}
          </p>
        ) : null}
        <DialogFooter>
          <Button variant="variant-ringed-primary" action={onClose}>
            {t('common.cancel', { defaultValue: 'Cancel' })}
          </Button>
          <Button
            variant="variant-filled-error"
            action={submit}
            disabled={submitting}
          >
            {t('admin.groups.delete', { defaultValue: 'Delete group' })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
