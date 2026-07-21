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
} from '@openpeeps/common/types';
import { getProfileAvatar, profileName } from '@openpeeps/common/lib';

import { BaseEmailLayout } from '../../BaseEmailLayout';
import { emailStyles } from '../../styles';

interface Locals {
  recipientProfile: PublicProfile;
  senderProfile: PublicProfile;
  post: PublicPost;
}

const formatJamWhen = (event: Event, locale?: string): string => {
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...(event.timeZone ? { timeZone: event.timeZone } : {}),
  };

  if (event.wholeDay) {
    return new Date(event.start).toLocaleDateString(locale, options);
  }

  return new Date(event.start).toLocaleString(locale, {
    ...options,
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  });
};

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
        {event.start ? (
          <Text style={emailStyles.paragraph}>
            {t('emails.jamModerator.scheduledFor', {
              when: formatJamWhen(event, i18n.language),
            })}
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
