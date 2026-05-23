import { useEffect, useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { Event, PostCreationData, PublicProfile } from '@openpeeps/common/types';
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
import {
  eventSanitizer,
  useNewPostStores,
} from '../../stores';
import { useNavigate } from '../../contexts/router';
import { useOpenpeeps } from '../../contexts/openpeeps';
import { useT } from '../../i18n';
import { useServerInfo } from '../server-data';
import { useCurrentProfile } from '../layout/IdentityContext';
import { Avatar, ProfileCard } from '../profile';
import { PostAudienceSelector } from '../post/post-form/PostAudienceSelector';
import { audienceSummary } from '../post/post-form/audienceChoices';

export interface CreateNewJamModalProps {
  onClose: () => void;
}

export function CreateNewJamModal({ onClose }: CreateNewJamModalProps) {
  const t = useT();
  const navigate = useNavigate();
  const me = useCurrentProfile();
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

  const selectedGroupName = useMemo(
    () =>
      me?.memberships?.find((m) => m.group.id === postData.groupId)?.group
        .displayName,
    [me?.memberships, postData.groupId],
  );

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
          audience: includesMe
            ? audience
            : [...audience, ...(me ? [me] : [])],
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
            <DialogTitle>
              {t('jams.create.title', { defaultValue: 'Start a jam' })}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="jam-name">
                {t('jams.form.name', { defaultValue: 'Jam name' })}
              </Label>
              <Input
                id="jam-name"
                value={event.name ?? ''}
                onChange={(e) => patchEvent({ name: e.target.value })}
              />
            </div>

            {me ? (
              <button
                type="button"
                className="hover:bg-surface-100 flex w-full items-center gap-3 rounded-md border p-3 text-left"
                onClick={() => setAudienceOpen(true)}
              >
                <Avatar profile={me} size={3} borderless />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="flex items-center gap-1 font-medium capitalize">
                    {me.displayName ?? me.handle}
                    <ChevronDown className="text-muted-foreground size-4" />
                  </span>
                  <span className="text-muted-foreground truncate text-sm">
                    {audienceSummary(
                      postData.visibility,
                      t,
                      selectedGroupName,
                      postData.audience?.length,
                    )}
                  </span>
                </span>
              </button>
            ) : null}

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={event.jam?.waitingRoom ?? false}
                onChange={(e) =>
                  event.jam &&
                  patchEvent({
                    jam: { ...event.jam, waitingRoom: e.target.checked },
                  })
                }
              />
              <span className="text-sm">
                {t('events.form.jamWaitingRoom', {
                  defaultValue: 'Enable waiting room',
                })}
              </span>
            </label>

            <div className="space-y-2">
              <Label>
                {t('events.form.jamModerators', {
                  defaultValue: 'Jam moderators',
                })}
              </Label>
              {(profilesQuery.data ?? [])
                .filter((p) => p.id !== me?.id)
                .slice(0, 12)
                .map((profile) => {
                  const selected = event.jam?.moderators?.includes(profile.id);
                  return (
                    <button
                      key={profile.id}
                      type="button"
                      className={`w-full rounded-md text-left ${selected ? 'bg-primary/10' : ''}`}
                      onClick={() => toggleModerator(profile)}
                    >
                      <ProfileCard profile={profile} />
                    </button>
                  );
                })}
            </div>
          </div>

          {error ? <p className="text-error text-sm">{error}</p> : null}

          <DialogFooter className="justify-between gap-2">
            {isAdmin ? (
              <Button variant="variant-ringed-primary" action={handleSchedule}>
                {t('jams.createFlow.schedule', { defaultValue: 'Schedule' })}
              </Button>
            ) : (
              <Button variant="variant-ghost-primary" action={onClose}>
                {t('common.cancel', { defaultValue: 'Cancel' })}
              </Button>
            )}
            <Button
              variant="variant-filled-primary"
              disabled={submitting}
              action={handleCreate}
            >
              {submitting
                ? t('common.starting', { defaultValue: 'Starting…' })
                : t('jams.start.submit', { defaultValue: 'Start jam' })}
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
                  ? audience ?? undefined
                  : [...(audience ?? []), ...(me ? [me] : [])]
                : undefined,
          }));
        }}
      />
    </>
  );
}
