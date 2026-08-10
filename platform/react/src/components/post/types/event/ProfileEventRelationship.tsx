import type { Event, PublicPost } from '@openpeepshq/common/types';
import { calculateEffectiveRsvps } from '@openpeepshq/common/lib';
import { useT } from '../../../../i18n';
import { useCurrentProfile } from '../../../layout/IdentityContext';

export interface ProfileEventRelationshipProps {
  post: PublicPost;
}

export function ProfileEventRelationship({
  post,
}: ProfileEventRelationshipProps) {
  const t = useT();
  const me = useCurrentProfile();
  const event = post.data as Event;
  const myEvent = post.profile?.id === me?.id;
  const iAmModerator = !!event.moderators?.includes(me?.id ?? '');
  const myRsvp = calculateEffectiveRsvps(post).find(
    (rsvp) => me?.id === rsvp.profile.id,
  );

  if (myEvent) {
    return (
      <div className="text-muted-foreground rounded-2xl px-2">
        <span className="text-background text-center text-sm">
          {t('events.profileRelationship.owner', { defaultValue: 'Owner' })}
        </span>
      </div>
    );
  }

  if (iAmModerator) {
    return (
      <div className="text-muted-foreground rounded-2xl px-2">
        <span className="text-center text-sm">
          {t('events.profileRelationship.moderator', {
            defaultValue: 'Moderator',
          })}
        </span>
      </div>
    );
  }

  if (myRsvp?.response === 'yes') {
    return (
      <div className="text-muted-foreground rounded-2xl px-2">
        <span className="text-foreground text-center text-sm">
          {t('events.profileRelationship.attending', {
            defaultValue: 'Attending',
          })}
        </span>
      </div>
    );
  }

  if (myRsvp?.response === 'tentative') {
    return (
      <div className="text-muted-foreground rounded-2xl px-2">
        <span className="text-foreground text-center text-sm">
          {t('events.profileRelationship.tentative', {
            defaultValue: 'Tentative',
          })}
        </span>
      </div>
    );
  }

  return null;
}
