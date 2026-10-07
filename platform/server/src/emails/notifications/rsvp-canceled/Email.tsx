import { Button, Section, Text } from '@react-email/components';
import type {
  EmailGlobals,
  ExpandedNotification,
} from '@openpeepshq/common/types';
import {
  isRsvpCancelNotice,
  profileName,
  rsvpCancelWhenLabels,
} from '@openpeepshq/common/lib';

import { BaseEmailLayout } from '../../BaseEmailLayout';
import { EmailPostEmbed } from '../../EmailPostEmbed';
import { emailStyles } from '../../styles';

export const RsvpCanceledEmail = ({
  globals,
  locals,
}: {
  globals: EmailGlobals;
  locals: ExpandedNotification;
}) => {
  const { t } = globals.i18nContext;
  const event =
    locals.post?.data?.type === 'event' ? locals.post.data : undefined;
  const body = t('emails.rsvpCanceled.body', {
    profileName: locals.senderProfile ? profileName(locals.senderProfile) : '',
    eventName: event?.name?.trim() || t('emails.rsvpCanceled.eventFallback'),
  });
  const when =
    locals.post && isRsvpCancelNotice(locals.data)
      ? rsvpCancelWhenLabels(locals.post, locals.data)
      : undefined;
  const whenText = when?.series
    ? t('emails.rsvpCanceled.series')
    : when?.labels.join(', ');

  return (
    <BaseEmailLayout
      globals={globals}
      previewText={body}
      showGreeting
      recipientProfile={locals.recipientProfile}
    >
      <Text style={emailStyles.heading}>{body}</Text>
      {whenText ? <Text style={emailStyles.paragraph}>{whenText}</Text> : null}
      {locals.post ? (
        <Section>
          <EmailPostEmbed post={locals.post} globals={globals} />
          <Section style={emailStyles.ctaContainer}>
            <Button
              href={`${globals.serverData.rootUrl}/posts/${locals.post.id}`}
              style={emailStyles.button}
            >
              {t('emails.rsvpCanceled.cta')}
            </Button>
          </Section>
        </Section>
      ) : null}
    </BaseEmailLayout>
  );
};
