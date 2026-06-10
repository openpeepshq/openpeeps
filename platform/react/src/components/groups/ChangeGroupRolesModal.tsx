import { useState } from 'react';
import type {
  GroupMember,
  GroupRelationship,
  GroupWithMeta,
} from '@openpeeps/common/types';
import { defaultGroupRoles } from '@openpeeps/common/types';
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
} from '@openpeeps/react-ui';
import { useOpenpeeps } from '../../contexts/openpeeps';
import { useT } from '../../i18n';

export interface ChangeGroupRolesModalProps {
  group: GroupWithMeta;
  member: GroupMember;
  onClose: () => void;
}

export function ChangeGroupRolesModal({
  group,
  member,
  onClose,
}: ChangeGroupRolesModalProps) {
  const t = useT();
  const { openpeepsApi } = useOpenpeeps();
  const setMemberRoles = openpeepsApi.setGroupMemberRolesAction({
    id: group.id,
    memberId: member.profile.id,
  });

  const [roles, setRoles] = useState<Set<GroupRelationship>>(
    () => new Set(member.roles ?? []),
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleRole = (role: GroupRelationship, checked: boolean) => {
    setRoles((prev) => {
      const next = new Set(prev);
      if (checked) next.add(role);
      else next.delete(role);
      return next;
    });
  };

  const submit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await setMemberRoles({ roles: [...roles] });
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
            {t('groups.changeRoles.title', { defaultValue: 'Change roles' })}
          </DialogTitle>
        </DialogHeader>
        <p className="px-1 text-sm">
          {t('groups.changeRoles.description', {
            defaultValue: 'Update roles for @{{handle}}',
            handle: member.profile.handle,
          })}
        </p>
        <div className="space-y-3 px-1">
          {defaultGroupRoles.map((role) => (
            <div key={role} className="flex items-center justify-between gap-4">
              <Label htmlFor={`role-${role}`} classes="text-base font-medium">
                {t(`groups.roles.${role}`, { defaultValue: role })}
              </Label>
              <input
                id={`role-${role}`}
                type="checkbox"
                checked={roles.has(role)}
                onChange={(e) => toggleRole(role, e.target.checked)}
                className="size-4"
              />
            </div>
          ))}
        </div>
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
            variant="variant-filled-primary"
            action={submit}
            disabled={submitting}
          >
            {t('groups.changeRoles.confirm', { defaultValue: 'Save roles' })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
