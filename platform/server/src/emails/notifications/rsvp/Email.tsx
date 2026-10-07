import { Button, Section, Text } from '@react-email/components';
import type {
  EmailGlobals,
  ExpandedNotification,
} from '@openpeepshq/common/types';
import { profileName } from '@openpeepshq/common/lib';

import { BaseEmailLayout } from '../../BaseEmailLayout';
import { EmailPostEmbed } from '../../EmailPostEmbed';
import { emailStyles } from '../../styles';

export const RsvpEmail = ({
  globals,
  locals,
}: {
  globals: EmailGlobals;
  locals: ExpandedNotification;
}) => {
  const { t } = globals.i18nContext;
  const body = t('emails.rsvp.body', {
    profileName: locals.senderProfile ? profileName(locals.senderProfile) : '',
  });

  return (
    <BaseEmailLayout
      globals={globals}
      previewText={body}
      showGreeting
      recipientProfile={locals.recipientProfile}
    >
      <Text style={emailStyles.heading}>{body}</Text>
      {locals.post ? (
        <Section>
          <EmailPostEmbed post={locals.post} globals={globals} />
          <Section style={emailStyles.ctaContainer}>
            <Button
              href={`${globals.serverData.rootUrl}/posts/${locals.post.id}`}
              style={emailStyles.button}
            >
              {t('emails.rsvp.cta')}
            </Button>
          </Section>
        </Section>
      ) : null}
    </BaseEmailLayout>
  );
};
