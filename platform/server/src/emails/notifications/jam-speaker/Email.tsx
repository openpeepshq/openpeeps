import {
  Button,
  Container,
  Img,
  Section,
  Text,
} from '@react-email/components';
import { User } from 'lucide-react';
import type {
  EmailGlobals,
  Event,
  PublicPost,
  PublicProfile,
} from '@openpeepshq/common/types';
import {
  getJamUrl,
  getProfileAvatar,
  profileName,
} from '@openpeepshq/common/lib';

import { BaseEmailLayout } from '../../BaseEmailLayout';
import { emailStyles } from '../../styles';

interface Locals {
  recipientProfile: PublicProfile;
  senderProfile: PublicProfile;
  post: PublicPost;
}

export const JamSpeakerEmail = ({
  globals,
  locals,
}: {
  globals: EmailGlobals;
  locals: Locals;
}) => {
  const { t } = globals.i18nContext;
  const event = locals.post.data as Event;

  return (
    <BaseEmailLayout
      globals={globals}
      previewText={t('emails.jamSpeaker.body', {
        profileName: profileName(locals.senderProfile),
      })}
      showGreeting
      recipientProfile={locals.recipientProfile}
    >
      <Text style={emailStyles.heading}>{t('emails.jams.speaker')}</Text>
      <Container style={emailStyles.contentContainer}>
        <Container style={emailStyles.profileIcons}>
          <User />
          <Img
            src={getProfileAvatar(
              locals.senderProfile,
              globals.communityConfig,
            )}
            alt={profileName(locals.senderProfile) || ''}
            style={emailStyles.avatar}
            width="44"
            height="44"
          />
        </Container>
        <Text style={emailStyles.paragraph}>
          {t('emails.jams.speaker.description', { jamName: event?.name })}
        </Text>
      </Container>

      <Section style={emailStyles.ctaContainer}>
        <Button
          href={getJamUrl(locals.post.id, globals.serverData.rootUrl)}
          style={emailStyles.button}
        >
          {t('emails.jamSpeaker.cta')}
        </Button>
      </Section>
    </BaseEmailLayout>
  );
};
