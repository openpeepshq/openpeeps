import {
  Button,
  Heading,
  Link,
  Section,
  Text,
} from '@react-email/components';
import type {
  EmailGlobals,
  ExpandedNotification,
} from '@openpeeps/common/types';
import { groupName, profileName } from '@openpeeps/common/lib';

import { BaseEmailLayout } from '../../BaseEmailLayout';
import { emailStyles } from '../../styles';

export const GroupMemberLeftEmail = ({
  globals,
  locals,
}: {
  globals: EmailGlobals;
  locals: ExpandedNotification;
}) => {
  const { t } = globals.i18nContext;
  const senderName = locals.senderProfile ? profileName(locals.senderProfile) : '';
  const gName = locals.group ? groupName(locals.group) : '';

  return (
    <BaseEmailLayout
      globals={globals}
      previewText={t('emails.groupMemberLeft.title', {
        profileName: senderName,
        groupName: gName,
        communityName: globals.communityConfig.info.name,
      })}
      showGreeting
      recipientProfile={locals.recipientProfile}
    >
      <Heading style={emailStyles.heading}>
        {t('emails.groupMemberLeft.title', {
          profileName: senderName,
          groupName: gName,
          communityName: globals.communityConfig.info.name,
        })}
      </Heading>
      <Section>
        <Text style={emailStyles.paragraph}>
          {t('emails.groupMemberLeft.body', {
            profileName: senderName,
            groupName: gName,
          })}
        </Text>
        <Text style={emailStyles.paragraph}>
          <Link
            href={`${globals.serverData.rootUrl}/@${locals.senderProfile?.handle}`}
            style={emailStyles.linkStyle}
          >
            {t('emails.groupMemberLeft.profileCta')}
          </Link>
        </Text>
      </Section>
      <Section style={emailStyles.ctaContainer}>
        <Button
          href={`${globals.serverData.rootUrl}/groups/@${locals.group?.handle}`}
          style={emailStyles.button}
        >
          {t('emails.groupMemberLeft.cta')}
        </Button>
      </Section>
    </BaseEmailLayout>
  );
};
