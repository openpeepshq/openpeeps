import { Button, Container, Img, Section, Text } from '@react-email/components';
import { UserMinus } from 'lucide-react';
import type {
  EmailGlobals,
  PublicPost,
  PublicProfile,
} from '@openpeepshq/common/types';
import { getProfileAvatar, profileName } from '@openpeepshq/common/lib';

import { BaseEmailLayout } from '../../BaseEmailLayout';
import { emailStyles } from '../../styles';

interface Locals {
  recipientProfile: PublicProfile;
  senderProfile: PublicProfile;
  post: PublicPost;
}

export const CoOrganizerRemovedEmail = ({
  globals,
  locals,
}: {
  globals: EmailGlobals;
  locals: Locals;
}) => {
  const { t } = globals.i18nContext;
  const eventUrl = `${globals.serverData.rootUrl}/posts/${locals.post.id}`;

  return (
    <BaseEmailLayout
      globals={globals}
      previewText={t('emails.coOrganizerRemoved.body', {
        profileName: profileName(locals.senderProfile),
      })}
      showGreeting
      recipientProfile={locals.recipientProfile}
    >
      <Text style={emailStyles.heading}>{t('emails.events.coOrganizer')}</Text>
      <Container style={emailStyles.contentContainer}>
        <Container style={emailStyles.profileIcons}>
          <UserMinus />
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
          {t('emails.coOrganizerRemoved.body', {
            profileName: profileName(locals.senderProfile),
          })}
        </Text>
      </Container>

      <Section style={emailStyles.ctaContainer}>
        <Button href={eventUrl} style={emailStyles.button}>
          {t('emails.coOrganizerRemoved.cta')}
        </Button>
      </Section>
    </BaseEmailLayout>
  );
};
