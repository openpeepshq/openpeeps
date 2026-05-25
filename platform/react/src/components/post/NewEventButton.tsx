import { useCallback, useMemo } from 'react';
import { CalendarPlus } from 'lucide-react';
import {
  canCreatePost,
  type GroupWithMeta,
  type ProfileWithMeta,
  type VisibilityType,
} from '@openpeeps/common';
import { Button } from '@openpeeps/react-ui';
import { useT } from '../../i18n';
import { getNewPostStores, useSetPlusButtonActions } from '../../stores';
import { useAuthData } from '../layout/IdentityContext';

export interface NewEventButtonProps {
  visibility: VisibilityType;
  currentProfile?: ProfileWithMeta;
  group?: GroupWithMeta;
  onNavigate?: () => void;
}

export function NewEventButton({
  visibility,
  currentProfile,
  group,
  onNavigate,
}: NewEventButtonProps) {
  const t = useT();
  const authData = useAuthData();
  const stores = getNewPostStores();

  const profile = currentProfile ?? authData.profile;
  const canPost =
    !!profile && canCreatePost(authData, 'event', visibility, group);

  const openNewEvent = useCallback(() => {
    stores.event = {
      ...stores.event,
      visibility,
      groupId: group?.id,
    };
    if (onNavigate) {
      onNavigate();
      return;
    }
    window.location.assign('/events/new');
  }, [stores, visibility, group?.id, onNavigate]);

  const plusActions = useMemo(
    () =>
      canPost
        ? {
            title: t('events.form.title', { defaultValue: 'New event' }),
            icon: CalendarPlus,
            action: openNewEvent,
          }
        : undefined,
    [canPost, t, openNewEvent],
  );

  useSetPlusButtonActions(plusActions);

  if (!canPost) {
    return null;
  }

  return (
    <div className="mb-4 p-4 pb-0">
      <Button
        title={t('events.form.title', { defaultValue: 'New event' })}
        variant="variant-filled-primary"
        action={openNewEvent}
        data-testid="events-new-event-button"
      >
        <CalendarPlus className="mr-1 size-4" />
        {t('events.form.title', { defaultValue: 'New event' })}
      </Button>
    </div>
  );
}
