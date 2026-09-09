import { Button, Container, Img, Section, Text } from '@react-email/components';
import { User } from 'lucide-react';
import type {
  EmailGlobals,
  Event,
  PublicPost,
  PublicProfile,
} from '@openpeepshq/common/types';
import {
  getProfileAvatar,
  profileName,
  formatEventWhen,
} from '@openpeepshq/common/lib';

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
  const { t, i18n } = globals.i18nContext;
  const event = locals.post.data as Event;
  const eventUrl = `${globals.serverData.rootUrl}/posts/${locals.post.id}`;
  const when = event.start
    ? formatEventWhen(event.start, {
        end: event.end,
        timeZone: globals.timeZone,
        allDay: event.wholeDay,
        locale: i18n.language,
      })
    : null;

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
          {t('emails.jamModerator.body', {
            profileName: profileName(locals.senderProfile),
          })}
        </Text>
        {when ? (
          <Text style={emailStyles.paragraph}>
            {t('emails.jamModerator.scheduledFor', { when })}
          </Text>
        ) : null}
      </Container>

      <Section style={emailStyles.ctaContainer}>
        <Button href={eventUrl} style={emailStyles.button}>
          {t('emails.jamModerator.cta')}
        </Button>
      </Section>
    </BaseEmailLayout>
  );
};
