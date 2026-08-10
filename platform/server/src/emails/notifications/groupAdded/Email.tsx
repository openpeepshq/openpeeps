import { Button, Heading, Section, Text } from '@react-email/components';
import type {
  EmailGlobals,
  ExpandedNotification,
} from '@openpeepshq/common/types';
import { groupName, profileName } from '@openpeepshq/common/lib';

import { BaseEmailLayout } from '../../BaseEmailLayout';
import { emailStyles } from '../../styles';

export const GroupAddedEmail = ({
  globals,
  locals,
}: {
  globals: EmailGlobals;
  locals: ExpandedNotification;
}) => {
  const { t } = globals.i18nContext;
  const senderName = locals.senderProfile
    ? profileName(locals.senderProfile)
    : '';
  const gName = locals.group ? groupName(locals.group) : '';

  return (
    <BaseEmailLayout
      globals={globals}
      previewText={t('emails.groupAdded.title', {
        groupName: gName,
        communityName: globals.communityConfig.info.name,
      })}
      showGreeting
      recipientProfile={locals.recipientProfile}
    >
      <Heading style={emailStyles.heading}>
        {t('emails.groupAdded.title', {
          groupName: gName,
          communityName: globals.communityConfig.info.name,
        })}
      </Heading>
      <Section>
        <Text style={emailStyles.paragraph}>
          {t('emails.groupAdded.body', {
            profileName: senderName,
            groupName: gName,
            communityName: globals.communityConfig.info.name,
          })}
        </Text>
        <Text style={emailStyles.paragraph}>{locals.group?.description}</Text>
      </Section>
      <Section style={emailStyles.ctaContainer}>
        <Button
          href={`${globals.serverData.rootUrl}/groups/@${locals.group?.handle}`}
          style={emailStyles.button}
        >
          {t('emails.groupAdded.cta')}
        </Button>
      </Section>
    </BaseEmailLayout>
  );
};
