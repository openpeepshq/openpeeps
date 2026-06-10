import { useMemo, useState } from 'react';
import { Check, Search } from 'lucide-react';
import type { GroupWithMeta, PublicProfile } from '@openpeeps/common/types';
import { groupName, matchesQuery } from '@openpeeps/common/lib';
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
} from '@openpeeps/react-ui';
import { useOpenpeeps } from '../../contexts/openpeeps';
import { useT } from '../../i18n';
import { useCurrentProfile } from '../layout/IdentityContext';
import { Avatar } from '../profile';

export interface AddGroupMemberModalProps {
  group: GroupWithMeta;
  onClose: () => void;
}

export function AddGroupMemberModal({ group, onClose }: AddGroupMemberModalProps) {
  const t = useT();
  const me = useCurrentProfile();
  const { openpeepsApi } = useOpenpeeps();
  const profilesQuery = openpeepsApi.useProfiles();
  const membersQuery = openpeepsApi.useGroupMembers(group.id);
  const addMember = openpeepsApi.addGroupMemberAction({ id: group.id });

  const [profileQuery, setProfileQuery] = useState('');
  const [selectedProfiles, setSelectedProfiles] = useState<PublicProfile[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const memberIds = useMemo(
    () => new Set((membersQuery.data ?? []).map((m) => m.profile.id)),
    [membersQuery.data],
  );

  const selectableProfiles = useMemo(() => {
    return (profilesQuery.data ?? []).filter(
      (profile) =>
        profile.id !== me?.id &&
        !memberIds.has(profile.id) &&
        (!profileQuery || matchesQuery(profile, profileQuery)),
    );
  }, [profilesQuery.data, me?.id, memberIds, profileQuery]);

  const toggleProfile = (profile: PublicProfile) => {
    setSelectedProfiles((prev) =>
      prev.some((p) => p.id === profile.id)
        ? prev.filter((p) => p.id !== profile.id)
        : [...prev, profile],
    );
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      for (const profile of selectedProfiles) {
        await addMember(profile);
      }
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {t('groups.modals.addMembers.title', {
              defaultValue: 'Add members to {{groupName}}',
              groupName: groupName(group),
            })}
          </DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2" />
          <Input
            className="pl-9"
            value={profileQuery}
            onChange={(e) => setProfileQuery(e.target.value)}
            placeholder={t('conversations.new.searchProfiles', {
              defaultValue: 'Search profiles…',
            })}
          />
        </div>

        <div className="max-h-64 space-y-1 overflow-y-auto">
          {selectableProfiles.map((profile) => {
            const selected = selectedProfiles.some((p) => p.id === profile.id);
            return (
              <button
                key={profile.id}
                type="button"
                className="hover:bg-surface-100 flex w-full items-center gap-2 rounded-md p-2 text-left"
                onClick={() => toggleProfile(profile)}
              >
                <Avatar profile={profile} size={3} />
                <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                  {profile.displayName || `@${profile.handle}`}
                </span>
                {selected ? <Check className="text-primary ml-auto size-4" /> : null}
              </button>
            );
          })}
        </div>

        <DialogFooter>
          <Button variant="variant-ringed-primary" action={onClose}>
            {t('common.cancel', { defaultValue: 'Cancel' })}
          </Button>
          <Button
            variant="variant-filled-primary"
            action={submit}
            disabled={!selectedProfiles.length || submitting}
          >
            {t('groups.modals.addMembers.add', { defaultValue: 'Add' })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
