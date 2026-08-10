import { Button, Section, Text } from '@react-email/components';
import type { EmailGlobals, ExpandedNotification } from '@openpeepshq/common/types';
import { profileName } from '@openpeepshq/common/lib';

import { BaseEmailLayout } from '../../BaseEmailLayout';
import { EmailPostEmbed } from '../../EmailPostEmbed';
import { emailStyles } from '../../styles';

export const MentionEmail = ({
  globals,
  locals,
}: {
  globals: EmailGlobals;
  locals: ExpandedNotification;
}) => {
  const { t } = globals.i18nContext;

  return (
    <BaseEmailLayout
      globals={globals}
      previewText={t('emails.mention.body', {
        profileName: profileName(locals.senderProfile ?? undefined),
        communityName: globals.communityConfig.info.name,
      })}
      showGreeting
      recipientProfile={locals.recipientProfile}
    >
      <Text style={emailStyles.heading}>
        {t('emails.mention.body', {
          profileName: profileName(locals.senderProfile ?? undefined),
          communityName: globals.communityConfig.info.name,
        })}
      </Text>
      {locals.post ? (
        <Section>
          <EmailPostEmbed post={locals.post} globals={globals} />
          <Section style={emailStyles.ctaContainer}>
            <Button
              href={`${globals.serverData.rootUrl}/posts/${locals.post.id}`}
              style={emailStyles.button}
            >
              {t('emails.mention.cta')}
            </Button>
          </Section>
        </Section>
      ) : null}
    </BaseEmailLayout>
  );
};
