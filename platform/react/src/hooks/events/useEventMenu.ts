import { useMemo } from 'react';
import type { Event, PublicPost } from '@openpeepshq/common/types';
import {
  checkPostCapabilities,
  upsertEventException,
} from '@openpeepshq/common/lib';
import { useOpenpeeps } from '../../contexts/openpeeps';
import { useNavigate } from '../../contexts/router';
import { getNewPostStores } from '../../stores/newPosts';
import {
  useAuthData,
  useCurrentProfile,
} from '../../components/layout/IdentityContext';
import { useCapabilities } from '../../components/server-data/context';

/**
 * True when the viewer is the event author or a listed co-organizer.
 * Deliberately not capability-based: instance-role `core-posts-*` (e.g. admin)
 * must not turn into "organizer" UI on every local event.
 */
export const useEventOrganizer = (post: PublicPost) => {
  const me = useCurrentProfile();
  const event = post.data?.type === 'event' ? post.data : undefined;
  return useMemo(
    () =>
      !!me &&
      (me.id === post.profile.id ||
        (event?.coOrganizers?.includes(me.id) ?? false)),
    [me, post.profile.id, event?.coOrganizers],
  );
};

/** Organizer actions for an event; `onOccurrenceDeleted` runs after a single occurrence is cancelled. */
export const useEventMenu = (
  post: PublicPost,
  occurrence: string | undefined,
  onOccurrenceDeleted: () => void,
) => {
  const navigate = useNavigate();
  const authData = useAuthData();
  const capabilities = useCapabilities();
  const { openpeepsApi } = useOpenpeeps();
  const updatePost = openpeepsApi.updatePostAction({ id: post.id });
  const event = post.data as Event;
  const thisOccurrence = !!event.recurrence && !!occurrence;

  const canDeletePost = useMemo(
    () =>
      checkPostCapabilities(authData, ['core-posts-delete'], post, capabilities)
        .success,
    [authData, post, capabilities],
  );

  const duplicate = () => {
    getNewPostStores().event = {
      type: 'event',
      visibility: post.visibility,
      // The duplicator becomes the new author; carry-over co-organizers would
      // silently get edit rights on the copy.
      data: { ...(post.data as Event), coOrganizers: undefined },
      audience: post.audience,
      groupId: post.groupId,
      mentions: post.mentions,
    };
    navigate({ type: 'events', view: 'new' });
  };

  const deleteThisOccurrence = async () => {
    if (!occurrence) return;
    await updatePost(
      upsertEventException(event, {
        recurrenceId: occurrence,
        cancelled: true,
      }),
    );
    onOccurrenceDeleted();
  };

  const isOrganizer = useEventOrganizer(post);

  return {
    isOrganizer,
    canDeletePost,
    thisOccurrence,
    duplicate,
    deleteThisOccurrence,
  };
};
