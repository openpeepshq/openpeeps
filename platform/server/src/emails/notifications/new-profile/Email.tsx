import {
  Button,
  Heading,
  Section,
  Text,
} from '@react-email/components';
import type {
  EmailGlobals,
  ExpandedNotification,
} from '@openpeepshq/common/types';
import { profileName } from '@openpeepshq/common/lib';

import { BaseEmailLayout } from '../../BaseEmailLayout';
import { emailStyles } from '../../styles';

export const NewProfileEmail = ({
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
      previewText={t('emails.newProfile.title', {
        communityName: globals.communityConfig.info.name,
      })}
      showGreeting
      recipientProfile={locals.recipientProfile}
    >
      <Heading style={emailStyles.heading}>
        {t('emails.newProfile.title', {
          communityName: globals.communityConfig.info.name,
        })}
      </Heading>
      <Section>
        <Text style={emailStyles.paragraph}>
          {t('emails.newProfile.body', {
            profileName: locals.senderProfile
              ? profileName(locals.senderProfile)
              : '',
            communityName: globals.communityConfig.info.name,
          })}
        </Text>
      </Section>
      <Section style={emailStyles.ctaContainer}>
        <Button
          href={`${globals.serverData.rootUrl}/@${locals.senderProfile?.handle}`}
          style={emailStyles.button}
        >
          {t('emails.welcome.cta')}
        </Button>
      </Section>
    </BaseEmailLayout>
  );
};
