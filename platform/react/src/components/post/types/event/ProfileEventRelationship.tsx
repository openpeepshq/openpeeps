import type { Event, PublicPost } from '@openpeepshq/common/types';
import { calculateEffectiveRsvps } from '@openpeepshq/common/lib';
import { Badge, type BadgeVariant } from '@openpeepshq/react-ui';
import { useT } from '../../../../i18n';
import { useCurrentProfile } from '../../../layout/IdentityContext';

export interface ProfileEventRelationshipProps {
  post: PublicPost;
}

type RelationshipBadge = {
  status: string;
  variant: BadgeVariant;
};

export const ProfileEventRelationship = ({
  post,
}: ProfileEventRelationshipProps) => {
  const t = useT();
  const me = useCurrentProfile();
  const event = post.data as Event;
  const myEvent = post.profile?.id === me?.id;
  const iAmModerator = !!event.moderators?.includes(me?.id ?? '');
  const myRsvp = calculateEffectiveRsvps(post).find(
    (rsvp) => me?.id === rsvp.profile.id,
  );

  const badge = ((): RelationshipBadge | null => {
    if (myEvent) {
      return {
        status: t('events.profileRelationship.owner', {
          defaultValue: 'Owner',
        }),
        variant: 'default',
      };
    }
    if (iAmModerator) {
      return {
        status: t('events.profileRelationship.moderator', {
          defaultValue: 'Moderator',
        }),
        variant: 'default',
      };
    }
    if (myRsvp?.response === 'yes') {
      return {
        status: t('events.profileRelationship.attending', {
          defaultValue: 'Attending',
        }),
        variant: 'success',
      };
    }
    if (myRsvp?.response === 'tentative') {
      return {
        status: t('events.profileRelationship.tentative', {
          defaultValue: 'Tentative',
        }),
        variant: 'outline',
      };
    }
    return null;
  })();

  if (!badge) return null;

  return <Badge status={badge.status} variant={badge.variant} />;
};
