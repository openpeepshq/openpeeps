import { useEffect, useMemo, useState } from 'react';
import { CheckCircle } from 'lucide-react';
import type {
  AudienceSetting,
  GroupWithMeta,
  PostType,
  PublicProfile,
  VisibilityType,
} from '@openpeeps/common';
import { checkGroupCapabilities } from '@openpeeps/common/lib';
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@openpeeps/react-ui';
import { useT } from '../../../i18n';
import { useAuthData, useCurrentProfile } from '../../layout/IdentityContext';
import { useServerInfo } from '../../server-data';
import { GroupCard } from '../../groups/GroupCard';
import { ProfileCard } from '../../profile';
import { useOpenpeeps } from '../../../contexts/openpeeps';
import { buildAudienceChoices } from './audienceChoices';

export interface PostAudienceSelectorProps {
  open: boolean;
  onClose: () => void;
  type?: PostType;
  visibility: VisibilityType;
  groupId?: string;
  audience?: PublicProfile[];
  showDirect?: boolean;
  onConfirm: (settings: AudienceSetting) => void;
}

export function PostAudienceSelector({
  open,
  onClose,
  type = 'note',
  visibility,
  groupId,
  audience = [],
  showDirect = true,
  onConfirm,
}: PostAudienceSelectorProps) {
  const t = useT();
  const authData = useAuthData();
  const me = useCurrentProfile();
  const serverInfo = useServerInfo();
  const { openpeepsApi } = useOpenpeeps();
  const [draftVisibility, setDraftVisibility] = useState(visibility);
  const [draftGroupId, setDraftGroupId] = useState(groupId);
  const [draftAudience, setDraftAudience] = useState(audience);
  const [view, setView] = useState<'main' | 'groups' | 'audience'>('main');
  const [search, setSearch] = useState('');

  const profilesQuery = openpeepsApi.useSearchProfiles(search);

  useEffect(() => {
    if (!open) return;
    setDraftVisibility(visibility);
    setDraftGroupId(groupId);
    setDraftAudience(audience);
    setView('main');
    setSearch('');
  }, [open, visibility, groupId, audience]);

  const choices = useMemo(
    () =>
      buildAudienceChoices(type, authData, t, {
        publicContent: serverInfo.publicContent,
        showDirect,
      }),
    [type, authData, t, serverInfo.publicContent, showDirect],
  );

  const groups = useMemo(
    () =>
      me?.memberships
        ?.map((m) => m.group)
        .filter((grp) =>
          checkGroupCapabilities(
            authData,
            [`core-posts-create-${type}`],
            grp,
          ).success,
        ) ?? [],
    [me, authData, type],
  );

  const profileResults = (profilesQuery.data?.pages ?? [])
    .flat()
    .map((item) => item.data)
    .filter((p) => p.id !== me?.id)
    .slice(0, 8);

  const selectVisibility = (value: VisibilityType) => {
    setDraftVisibility(value);
    if (value === 'group' && !draftGroupId) {
      setView('groups');
      return;
    }
    if (value === 'direct' && draftAudience.length === 0) {
      setView('audience');
      return;
    }
    if (value !== 'group') setDraftGroupId(undefined);
    if (value !== 'direct') setDraftAudience([]);
  };

  const toggleAudience = (profile: PublicProfile) => {
    setDraftAudience((prev) =>
      prev.some((p) => p.id === profile.id)
        ? prev.filter((p) => p.id !== profile.id)
        : [...prev, profile],
    );
  };

  const confirm = () => {
    onConfirm({
      visibility: draftVisibility,
      groupId: draftGroupId,
      audience: draftAudience.length ? draftAudience : undefined,
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {t('posts.form.audienceTitle', { defaultValue: 'Who can see this?' })}
          </DialogTitle>
        </DialogHeader>

        {view === 'groups' ? (
          <div className="space-y-2">
            {groups.map((group) => (
              <button
                key={group.id}
                type="button"
                className="flex w-full items-center justify-between rounded-md border p-2 text-left"
                onClick={() => {
                  setDraftGroupId(group.id);
                  setDraftVisibility('group');
                  setView('main');
                }}
              >
                <GroupCard group={group as GroupWithMeta} noPadding />
                {draftGroupId === group.id ? (
                  <CheckCircle className="text-primary size-5" />
                ) : null}
              </button>
            ))}
            {groups.length === 0 ? (
              <p className="text-muted-foreground py-4 text-center text-sm">
                {t('posts.form.noGroups', { defaultValue: 'No groups available' })}
              </p>
            ) : null}
          </div>
        ) : view === 'audience' ? (
          <div className="space-y-2">
            <input
              className="w-full rounded-md border px-3 py-2 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('posts.form.mentionSearch', {
                defaultValue: 'Search members…',
              })}
            />
            {profileResults.map((profile) => {
              const selected = draftAudience.some((p) => p.id === profile.id);
              return (
                <button
                  key={profile.id}
                  type="button"
                  className={`w-full rounded-md text-left ${selected ? 'bg-primary/10' : ''}`}
                  onClick={() => toggleAudience(profile)}
                >
                  <ProfileCard profile={profile} />
                </button>
              );
            })}
          </div>
        ) : (
          <div className="space-y-2">
            {choices.map((choice) => {
              const Icon = choice.icon;
              return (
                <button
                  key={choice.value}
                  type="button"
                  className="hover:bg-surface-100 flex w-full items-start gap-3 rounded-md border p-3 text-left"
                  onClick={() => selectVisibility(choice.value)}
                >
                  <span className="bg-surface-100 flex size-10 items-center justify-center rounded-full">
                    <Icon className="size-5" />
                  </span>
                  <span className="flex-1">
                    <span className="block font-medium">{choice.title}</span>
                    <span className="text-muted-foreground block text-sm">
                      {choice.description}
                    </span>
                    {choice.value === 'group' && draftGroupId ? (
                      <span className="text-primary mt-1 block text-xs">
                        {groups.find((g) => g.id === draftGroupId)?.displayName ??
                          groups.find((g) => g.id === draftGroupId)?.handle}
                      </span>
                    ) : null}
                    {choice.value === 'direct' && draftAudience.length ? (
                      <span className="text-primary mt-1 block text-xs">
                        {draftAudience.length}{' '}
                        {t('posts.form.recipients', { defaultValue: 'recipients' })}
                      </span>
                    ) : null}
                  </span>
                  <span
                    className={`mt-1 size-4 rounded-full border ${draftVisibility === choice.value ? 'bg-primary border-primary' : ''}`}
                  />
                </button>
              );
            })}
          </div>
        )}

        <DialogFooter className="gap-2">
          {view !== 'main' ? (
            <Button variant="variant-ringed-surface" action={() => setView('main')}>
              {t('navigation.back', { defaultValue: 'Back' })}
            </Button>
          ) : (
            <Button variant="variant-ringed-surface" action={onClose}>
              {t('common.cancel', { defaultValue: 'Cancel' })}
            </Button>
          )}
          <Button variant="variant-filled-primary" action={confirm}>
            {t('common.done', { defaultValue: 'Done' })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
