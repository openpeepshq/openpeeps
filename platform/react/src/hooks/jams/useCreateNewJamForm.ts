import { useEffect, useMemo, useState } from 'react';
import type {
  AudienceSetting,
  Event,
  PostCreationData,
  PublicProfile,
} from '@openpeepshq/common/types';
import { hasAdminSidebarAccess } from '@openpeepshq/common/lib';
import { eventSanitizer, useNewPostStores } from '../../stores';
import { useNavigate } from '../../contexts/router';
import { useOpenpeeps } from '../../contexts/openpeeps';
import { useT } from '../../i18n/context';
import { useServerInfo } from '../../components/server-data';
import {
  useAuthData,
  useCurrentProfile,
} from '../../components/layout/IdentityContext';
import { applyAudienceSetting } from '../../lib/audienceSetting';
import { buildAudienceChoiceValues } from '../../lib/audienceChoices';

export interface UseCreateNewJamFormArgs {
  onClose: () => void;
}

/**
 * Draft state and actions for the "start a jam" dialog. The draft is kept in
 * the shared `jam` post store so reopening restores what was entered.
 */
export const useCreateNewJamForm = ({ onClose }: UseCreateNewJamFormArgs) => {
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
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const profilesQuery = openpeepsApi.useProfiles();
  const event = postData.data as Event;
  const isAdmin = hasAdminSidebarAccess(me?.roles ?? []);

  const audienceChoices = useMemo(
    () =>
      buildAudienceChoiceValues('event', authData, t, {
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

  const setWaitingRoom = (waitingRoom: boolean) => {
    if (!event.jam) return;
    patchEvent({ jam: { ...event.jam, waitingRoom } });
  };

  const applyAudience = (settings: AudienceSetting) =>
    setPostData((prev) => applyAudienceSetting(prev, settings, me));

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
      navigate({ type: 'jam', id: created.id, view: 'event' });
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
    navigate({ type: 'events', view: 'new' });
  };

  return {
    me,
    postData,
    event,
    isAdmin,
    submitting,
    error,
    visibilityDescription,
    selectedGroupName,
    selectedModerators,
    directAudience,
    patchEvent,
    setWaitingRoom,
    handleModeratorsChange,
    applyAudience,
    handleCreate,
    handleSchedule,
  };
};
