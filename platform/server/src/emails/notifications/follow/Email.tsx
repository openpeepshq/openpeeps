import { Button, Link, Section, Text } from '@react-email/components';
import type {
  EmailGlobals,
  ExpandedNotification,
} from '@openpeepshq/common/types';

import { BaseEmailLayout } from '../../BaseEmailLayout';
import { emailStyles } from '../../styles';

export const FollowEmail = ({
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
      previewText={t('emails.follow.body')}
      showGreeting
      recipientProfile={locals.recipientProfile}
    >
      <Text style={emailStyles.paragraph}>
        <Link
          href={`${globals.serverData.rootUrl}/@${locals.senderProfile?.handle}`}
          style={emailStyles.linkStyle}
        >
          @{locals.senderProfile?.handle}
        </Link>{' '}
        {t('emails.follow.body')}
      </Text>

      <Section style={emailStyles.ctaContainer}>
        <Button
          href={`${globals.serverData.rootUrl}/@${locals.senderProfile?.handle}`}
          style={emailStyles.button}
        >
          {t('emails.follow.cta')}
        </Button>
      </Section>
    </BaseEmailLayout>
  );
};
