import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2, Users } from 'lucide-react';
import { groupName } from '@openpeeps/common/lib';
import type { GroupWithMeta } from '@openpeeps/common/types';
import { useT, useOpenpeeps, useSetPageHeader } from '@openpeeps/react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
} from '@openpeeps/react-ui';

export function AdminGroups() {
  const t = useT();
  const navigate = useNavigate();
  const { openpeepsApi } = useOpenpeeps();
  const groupsQuery = openpeepsApi.admin.useAllGroupsList();
  const [search, setSearch] = useState('');
  const [toDelete, setToDelete] = useState<GroupWithMeta | null>(null);

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
          placeholder={t('common.search', { defaultValue: 'Search…' })}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-surface-100">
            <tr>
              <th className="p-2 text-left">Name</th>
              <th className="p-2 text-left">Handle</th>
              <th className="p-2 text-left">Members</th>
              <th className="p-2 text-left">Created</th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((g) => (
              <tr key={g.id} className="border-t">
                <td className="p-2">
                  <a className="hover:underline" href={`/groups/@${g.handle}`}>
                    {groupName(g)}
                  </a>
                </td>
                <td className="text-muted-foreground p-2">@{g.handle}</td>
                <td className="p-2">{g.membersCount}</td>
                <td className="text-muted-foreground p-2 text-xs">
                  {new Date(g.createdAt).toLocaleDateString()}
                </td>
                <td className="p-2 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Link
                      to={`/admin/groups/@${g.handle}/members`}
                      className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs"
                      title={t('admin.members.title', {
                        defaultValue: 'Members',
                      })}
                    >
                      <Users size={16} />
                      {t('admin.members.title', { defaultValue: 'Members' })}
                    </Link>
                    <button
                      type="button"
                      className="text-error hover:bg-error/10 rounded p-1"
                      title={t('admin.groups.delete', {
                        defaultValue: 'Delete group',
                      })}
                      onClick={() => setToDelete(g)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
  group: GroupWithMeta;
  onClose: () => void;
}) {
  const t = useT();
  const { openpeepsApi } = useOpenpeeps();
  const deleteGroup = openpeepsApi.deleteGroupAction();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await deleteGroup({ id: group.id });
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
