import { Button, Section, Text } from '@react-email/components';
import type {
  EmailGlobals,
  ExpandedNotification,
} from '@openpeepshq/common/types';

import { BaseEmailLayout } from '../../BaseEmailLayout';
import { EmailPostEmbed } from '../../EmailPostEmbed';
import { emailStyles } from '../../styles';

export const PollEndedEmail = ({
  globals,
  locals,
}: {
  globals: EmailGlobals;
  locals: ExpandedNotification;
}) => {
  const { t } = globals.i18nContext;
  const body = t('emails.pollEnded.body');

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
              {t('emails.pollEnded.cta')}
            </Button>
          </Section>
        </Section>
      ) : null}
    </BaseEmailLayout>
  );
};
