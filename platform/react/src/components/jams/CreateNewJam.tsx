import { useEffect, useMemo, useState } from 'react';
import { Check, Eye, Search, X } from 'lucide-react';
import type {
  Event,
  PostCreationData,
  PublicProfile,
} from '@openpeeps/common/types';
import {
  hasAdminSidebarAccess,
  matchesQuery,
  profileName,
} from '@openpeeps/common/lib';
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from '@openpeeps/react-ui';
import { eventSanitizer, useNewPostStores } from '../../stores';
import { useNavigate } from '../../contexts/router';
import { useOpenpeeps } from '../../contexts/openpeeps';
import { useT } from '../../i18n';
import { useServerInfo } from '../server-data';
import { useAuthData, useCurrentProfile } from '../layout/IdentityContext';
import { Avatar, ProfileCard } from '../profile';
import { PostAudienceSelector } from '../post/post-form/PostAudienceSelector';
import { buildAudienceChoices } from '../post/post-form/audienceChoices';

export interface CreateNewJamModalProps {
  onClose: () => void;
}

export function CreateNewJamModal({ onClose }: CreateNewJamModalProps) {
  const t = useT();
  const navigate = useNavigate();
  const me = useCurrentProfile();
  const authData = useAuthData();
  const serverInfo = useServerInfo();
  const { openpeepsApi } = useOpenpeeps();
  const createPost = openpeepsApi.createPostAction();
  const newPostStores = useNewPostStores();
  const sanitize = useMemo(
    () => eventSanitizer(serverInfo.publicContent),
    [serverInfo.publicContent],
  );

  const [postData, setPostData] = useState<PostCreationData>(() =>
    sanitize(newPostStores.jam),
  );
  const [audienceOpen, setAudienceOpen] = useState(false);
  const [moderatorSearch, setModeratorSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const profilesQuery = openpeepsApi.useProfiles();
  const event = postData.data as Event;
  const isAdmin = hasAdminSidebarAccess(me?.roles ?? []);

  const audienceChoices = useMemo(
    () =>
      buildAudienceChoices('event', authData, t, {
        publicContent: serverInfo.publicContent,
        showDirect: true,
      }),
    [authData, t, serverInfo.publicContent],
  );

  const visibilityDescription =
    audienceChoices.find((c) => c.value === postData.visibility)?.description ??
    t(`visibility.event.${postData.visibility}.description`, {
      defaultValue: '',
    });

  const selectedGroupName = useMemo(
    () =>
      me?.memberships?.find((m) => m.group.id === postData.groupId)?.group
        .displayName,
    [me?.memberships, postData.groupId],
  );

  // Persist the in-progress draft like the Svelte modal's `onchange` does, so
  // reopening the modal restores what was entered.
  useEffect(() => {
    newPostStores.jam = postData;
  }, [postData, newPostStores]);

  useEffect(() => {
    if (event.jam && event.jam.moderators.length === 0 && me?.id) {
      setPostData((prev) => {
        const ev = prev.data as Event;
        if (!ev.jam) return prev;
        return {
          ...prev,
          data: {
            ...ev,
            jam: { ...ev.jam, moderators: [me.id] },
          },
        };
      });
    }
  }, [me?.id, event.jam]);

  const patchEvent = (patch: Partial<Event>) => {
    setPostData((prev) => ({
      ...prev,
      data: { ...(prev.data as Event), ...patch },
    }));
  };

  const toggleModerator = (profile: PublicProfile) => {
    if (!event.jam) return;
    const ids = event.jam.moderators ?? [];
    const next = ids.includes(profile.id)
      ? ids.filter((id) => id !== profile.id)
      : [...ids, profile.id];
    patchEvent({ jam: { ...event.jam, moderators: next } });
  };

  const moderatorIds = event.jam?.moderators ?? [];
  const allProfiles = profilesQuery.data ?? [];
  const selectedModerators = allProfiles.filter((p) =>
    moderatorIds.includes(p.id),
  );
  const selectableProfiles = allProfiles.filter(
    (p) => !moderatorSearch || matchesQuery(p, moderatorSearch),
  );
  const directAudience = postData.audience ?? [];

  const handleCreate = async () => {
    setError(null);
    setSubmitting(true);
    try {
      let payload: PostCreationData = {
        ...postData,
        type: 'event',
        data: {
          ...(postData.data as Event),
          start: new Date().toISOString(),
        },
      };
      if (payload.visibility === 'direct') {
        const audience = payload.audience ?? [];
        const includesMe = audience.some((p) => p.id === me?.id);
        payload = {
          ...payload,
          audience: includesMe ? audience : [...audience, ...(me ? [me] : [])],
        };
      }
      newPostStores.jam = payload;
      const created = await createPost(payload);
      newPostStores.resetNewJamState();
      onClose();
      navigate(`/events/${created.id}/jam`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSchedule = () => {
    newPostStores.event = postData;
    newPostStores.resetNewJamState();
    onClose();
    navigate('/events/new');
  };

  return (
    <>
      <Dialog open onOpenChange={(next) => !next && onClose()}>
        <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('jams.create.title')}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="jam-name">{t('jams.form.name')}</Label>
              <Input
                id="jam-name"
                value={event.name ?? ''}
                onChange={(e) => patchEvent({ name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Eye className="text-muted-foreground size-4" />
                <Label>{t('visibility.event.title')}</Label>
              </div>
              <button
                type="button"
                className="hover:bg-surface-100 flex w-full items-center gap-2 rounded-md border p-3 text-left text-sm"
                onClick={() => setAudienceOpen(true)}
              >
                <span className="flex-1">{visibilityDescription}</span>
                {postData.visibility === 'group' && selectedGroupName ? (
                  <span className="text-primary truncate text-sm">
                    {selectedGroupName}
                  </span>
                ) : null}
                {postData.visibility === 'direct' ? (
                  <span className="flex items-center">
                    {directAudience.slice(0, 5).map((profile) => (
                      <Avatar
                        key={profile.id}
                        profile={profile}
                        size={1.5}
                        borderless
                        containerClassName="-ml-2"
                      />
                    ))}
                    {directAudience.length > 5 ? (
                      <span className="ml-1 text-sm">
                        +{directAudience.length - 5}
                      </span>
                    ) : null}
                  </span>
                ) : null}
              </button>
              <p className="text-muted-foreground text-xs">
                {t('events.form.visibilityNotChangeable')}
              </p>
            </div>

            <label className="flex items-start gap-2">
              <input
                type="checkbox"
                className="mt-1"
                checked={event.jam?.waitingRoom ?? false}
                onChange={(e) =>
                  event.jam &&
                  patchEvent({
                    jam: { ...event.jam, waitingRoom: e.target.checked },
                  })
                }
              />
              <span className="flex flex-col">
                <span className="text-sm">
                  {t('events.form.jamWaitingRoom')}
                </span>
                <span className="text-muted-foreground text-xs">
                  {t('events.form.jamWaitingRoomDescription')}
                </span>
              </span>
            </label>

            <div className="space-y-2">
              <Label>{t('events.form.jamModerators')}</Label>

              {selectedModerators.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {selectedModerators.map((profile) => (
                    <div
                      key={profile.id}
                      className="border-secondary bg-surface-50 text-primary flex items-center gap-1.5 rounded-md border px-2 py-1 text-sm"
                    >
                      <Avatar profile={profile} size={1.5} borderless />
                      <span className="font-medium">
                        {profileName(profile)}
                      </span>
                      <button
                        type="button"
                        className="hover:bg-secondary ml-1 rounded-full p-0.5"
                        title={t('common.remove', { defaultValue: 'Remove' })}
                        onClick={() => toggleModerator(profile)}
                      >
                        <X className="size-3" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="relative">
                <Search className="text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2" />
                <Input
                  className="pl-9"
                  value={moderatorSearch}
                  onChange={(e) => setModeratorSearch(e.target.value)}
                  placeholder={t('profile.search.profilesPlaceholder')}
                />
              </div>

              <div className="max-h-48 space-y-1 overflow-y-auto">
                {selectableProfiles.map((profile) => {
                  const selected = moderatorIds.includes(profile.id);
                  return (
                    <div
                      key={profile.id}
                      className="hover:bg-surface-100 flex w-full items-center justify-between rounded-md"
                    >
                      <ProfileCard
                        profile={profile}
                        onSelect={() => toggleModerator(profile)}
                        showAction={false}
                      />
                      {selected ? (
                        <Check className="text-primary mr-4 size-5 shrink-0" />
                      ) : null}
                    </div>
                  );
                })}
                {profilesQuery.isSuccess && selectableProfiles.length === 0 ? (
                  <p className="text-muted-foreground p-2 text-center text-sm">
                    {moderatorSearch
                      ? t('profile.search.noResults')
                      : t('profile.search.noProfilesAvailable')}
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          {error ? <p className="text-error text-sm">{error}</p> : null}

          <DialogFooter className="justify-between gap-2">
            {isAdmin ? (
              <Button variant="variant-ringed-primary" action={handleSchedule}>
                {t('jams.createFlow.schedule')}
              </Button>
            ) : null}
            <Button
              variant="variant-filled-primary"
              disabled={submitting}
              action={handleCreate}
            >
              {t('jams.start.submit')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PostAudienceSelector
        open={audienceOpen}
        onClose={() => setAudienceOpen(false)}
        type="event"
        visibility={postData.visibility}
        groupId={postData.groupId ?? undefined}
        audience={postData.audience ?? []}
        showDirect
        onConfirm={(settings) => {
          const audience = settings.audience;
          const includesMe = audience?.some((p) => p.id === me?.id);
          setPostData((prev) => ({
            ...prev,
            visibility: settings.visibility,
            groupId: settings.groupId ?? undefined,
            audience:
              settings.visibility === 'direct'
                ? includesMe
                  ? (audience ?? undefined)
                  : [...(audience ?? []), ...(me ? [me] : [])]
                : undefined,
          }));
        }}
      />
    </>
  );
}
