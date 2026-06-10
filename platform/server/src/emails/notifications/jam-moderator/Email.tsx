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
  PublicPost,
  PublicProfile,
} from '@openpeeps/common/types';
import {
  getJamUrl,
  getProfileAvatar,
  profileName,
} from '@openpeeps/common/lib';

import { BaseEmailLayout } from '../../BaseEmailLayout';
import { emailStyles } from '../../styles';

interface Locals {
  recipientProfile: PublicProfile;
  senderProfile: PublicProfile;
  post: PublicPost;
}

export const JamModeratorEmail = ({
  globals,
  locals,
}: {
  globals: EmailGlobals;
  locals: Locals;
}) => {
  const { t } = globals.i18nContext;

  return (
    <BaseEmailLayout
      globals={globals}
      previewText={t('emails.jamModerator.body', {
        profileName: profileName(locals.senderProfile),
      })}
      showGreeting
      recipientProfile={locals.recipientProfile}
    >
      <Text style={emailStyles.heading}>{t('emails.jams.moderator')}</Text>
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
            width="50"
            height="50"
          />
        </Container>
        <Text style={emailStyles.paragraph}>
          {t('emails.jams.moderator.description', {
            profileName: profileName(locals.senderProfile),
          })}
        </Text>
      </Container>

      <Section style={emailStyles.ctaContainer}>
        <Button
          href={getJamUrl(locals.post.id, globals.serverData.rootUrl)}
          style={emailStyles.button}
        >
          {t('emails.jamModerator.cta')}
        </Button>
      </Section>
    </BaseEmailLayout>
  );
};
