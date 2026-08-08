import { useEffect, useMemo, useState } from 'react';
import { Eye } from 'lucide-react';
import type {
  Event,
  PostCreationData,
  PublicProfile,
} from '@openpeeps/common/types';
import { hasAdminSidebarAccess } from '@openpeeps/common/lib';
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
import { Avatar, ProfilesInput } from '../profile';
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

  const handleModeratorsChange = (profiles: PublicProfile[]) => {
    if (!event.jam) return;
    patchEvent({
      jam: { ...event.jam, moderators: profiles.map((p) => p.id) },
    });
  };

  const moderatorIds = event.jam?.moderators ?? [];
  const allProfiles = profilesQuery.data ?? [];
  const selectedModerators = allProfiles.filter((p) =>
    moderatorIds.includes(p.id),
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
              <ProfilesInput
                value={selectedModerators}
                onChange={handleModeratorsChange}
                placeholder={t('events.form.jamModeratorsDescription', {
                  defaultValue: 'Click to select jam moderators',
                })}
              />
            </div>
          </div>

          {error ? <p className="text-error text-sm">{error}</p> : null}

          <DialogFooter>
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
