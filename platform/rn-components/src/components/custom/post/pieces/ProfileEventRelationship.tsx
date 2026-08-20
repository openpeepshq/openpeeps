import { View } from 'react-native';
import React from 'react';
import { calculateEffectiveRsvps, Event, PublicPost } from '@openpeepshq/common';
import { useOpenpeeps } from '@openpeepshq/react';
import { ThemedText } from '~/components/ui/themed-text';
import { useTranslation } from 'react-i18next';

interface ProfileEventRelationshipProps {
  post: PublicPost;
}


export const ProfileEventRelationship: React.FC<
  ProfileEventRelationshipProps
> = ({ post }) => {
  const event = post.data as Event;
  const { t } = useTranslation();
  const { currentProfile } = useOpenpeeps();
  const myEvent = post?.profile?.id === currentProfile?.id;
  const isModerator = event?.moderators?.find(
    profileId => profileId === currentProfile?.id,
  );
  const myRsvp =
    post &&
    calculateEffectiveRsvps(post).find(
      r => r.profile.id === currentProfile?.id,
    );

  const relationshipText = (() => {
    if (myEvent) {
      return t('events.profileRelationship.owner');
    } else if (isModerator) {
      return t('groups.roles.moderator');
    } else if (myRsvp?.response === 'yes') {
      return t('events.profileRelationship.attending');
    } else if (myRsvp?.response === 'tentative') {
      return t('events.profileRelationship.tentative');
    }
    return null;
  })();


  if (relationshipText) {
    return (
      <View className="bg-foreground px-2 py-1 rounded-2xl">
        <ThemedText className="text-background text-center text-sm">
          {relationshipText}
        </ThemedText>
      </View>
    );
  } else {
    return null;
  }
};
