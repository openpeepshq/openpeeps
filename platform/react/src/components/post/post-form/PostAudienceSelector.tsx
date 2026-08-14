import { useEffect, useMemo, useState } from 'react';
import { CheckCircle } from 'lucide-react';
import type {
  AudienceSetting,
  GroupWithMeta,
  PostType,
  PublicProfile,
  VisibilityType,
} from '@openpeepshq/common';
import { checkGroupCapabilities } from '@openpeepshq/common/lib';
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@openpeepshq/react-ui';
import { useT } from '../../../i18n';
import { useAuthData, useCurrentProfile } from '../../layout/IdentityContext';
import { useServerInfo } from '../../server-data';
import { GroupCard } from '../../groups/GroupCard';
import { ProfileBadge, ProfileSelector } from '../../profile';
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

export const PostAudienceSelector = ({
  open,
  onClose,
  type = 'note',
  visibility,
  groupId,
  audience = [],
  showDirect = true,
  onConfirm,
}: PostAudienceSelectorProps) => {
  const t = useT();
  const authData = useAuthData();
  const me = useCurrentProfile();
  const serverInfo = useServerInfo();
  const [draftVisibility, setDraftVisibility] = useState(visibility);
  const [draftGroupId, setDraftGroupId] = useState(groupId);
  const [draftAudience, setDraftAudience] = useState(audience);
  const [view, setView] = useState<'main' | 'groups' | 'audience'>('main');

  useEffect(() => {
    if (!open) return;
    setDraftVisibility(visibility);
    setDraftGroupId(groupId);
    setDraftAudience(audience);
    setView('main');
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
        .filter(
          (grp) =>
            checkGroupCapabilities(authData, [`core-posts-create-${type}`], grp)
              .success,
        ) ?? [],
    [me, authData, type],
  );

  const selectVisibility = (value: VisibilityType) => {
    setDraftVisibility(value);
    if (value !== 'direct') setDraftAudience([]);
    if (value !== 'group') setDraftGroupId(undefined);
    if (value === 'group' && !draftGroupId) {
      setView('groups');
      return;
    }
    if (value === 'direct') {
      setView('audience');
    }
  };

  const confirm = () => {
    onConfirm({
      visibility: draftVisibility,
      groupId: draftVisibility === 'group' ? draftGroupId : undefined,
      audience:
        draftVisibility === 'direct' && draftAudience.length
          ? draftAudience
          : undefined,
    });
    onClose();
  };

  return (
    <>
      <Dialog
        open={open && view !== 'audience'}
        onOpenChange={(next) => !next && onClose()}
      >
        <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {t('posts.form.audienceTitle', {
                defaultValue: 'Who can see this?',
              })}
            </DialogTitle>
          </DialogHeader>

          {view === 'groups' ? (
            <div className="space-y-2">
              {groups.map((group) => (
                <div
                  key={group.id}
                  className="flex w-full items-center justify-between rounded-md border p-2"
                >
                  <GroupCard
                    group={group as GroupWithMeta}
                    noPadding
                    showAction={false}
                    onSelect={() => {
                      setDraftGroupId(group.id);
                      setDraftVisibility('group');
                      setView('main');
                    }}
                  />
                  {draftGroupId === group.id ? (
                    <CheckCircle className="text-primary size-5" />
                  ) : null}
                </div>
              ))}
              {groups.length === 0 ? (
                <p className="text-muted-foreground py-4 text-center text-sm">
                  {t('posts.form.noGroups', {
                    defaultValue: 'No groups available',
                  })}
                </p>
              ) : null}
            </div>
          ) : (
            <div className="space-y-2">
              {choices.map((choice) => {
                const Icon = choice.icon;
                return (
                  <button
                    key={choice.value}
                    type="button"
                    aria-pressed={draftVisibility === choice.value}
                    className={`hover:bg-surface rounded-button flex w-full items-start gap-3 border p-3 text-left ${
                      draftVisibility === choice.value ? 'border-primary' : ''
                    }`}
                    onClick={() => selectVisibility(choice.value)}
                  >
                    <span className="bg-surface flex size-10 shrink-0 items-center justify-center rounded-full">
                      <Icon className="size-5" />
                    </span>
                    <span className="flex-1">
                      <span className="block font-medium">{choice.title}</span>
                      <span className="text-muted-foreground block text-sm">
                        {choice.description}
                      </span>
                      {choice.value === 'group' && draftGroupId ? (
                        <span className="text-primary mt-1 block text-xs">
                          {groups.find((g) => g.id === draftGroupId)
                            ?.displayName ??
                            groups.find((g) => g.id === draftGroupId)?.handle}
                        </span>
                      ) : null}
                      {choice.value === 'direct' && draftAudience.length ? (
                        <span className="mt-1 flex flex-wrap gap-1">
                          {draftAudience.map((profile) => (
                            <ProfileBadge
                              key={profile.id}
                              profile={profile}
                              onRemove={() =>
                                setDraftAudience((current) =>
                                  current.filter((p) => p.id !== profile.id),
                                )
                              }
                            />
                          ))}
                        </span>
                      ) : null}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          <DialogFooter>
            {view !== 'main' ? (
              <Button variant="outline" action={() => setView('main')}>
                {t('navigation.back', { defaultValue: 'Back' })}
              </Button>
            ) : (
              <Button variant="outline" action={onClose}>
                {t('common.cancel', { defaultValue: 'Cancel' })}
              </Button>
            )}
            <Button variant="default" action={confirm}>
              {t('common.done', { defaultValue: 'Done' })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ProfileSelector
        open={open && view === 'audience'}
        onOpenChange={(next) => {
          if (!next) setView('main');
        }}
        mode="multiple"
        selectedProfiles={draftAudience}
        banlist={me ? [me] : []}
        onConfirm={(profiles) => {
          setDraftAudience(profiles);
          setView('main');
        }}
        title={t('posts.form.audienceTitle', {
          defaultValue: 'Who can see this?',
        })}
      />
    </>
  );
};
