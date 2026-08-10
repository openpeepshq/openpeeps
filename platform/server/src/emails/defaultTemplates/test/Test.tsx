import { Button, Heading, Section, Text } from '@react-email/components';
import type { EmailGlobals } from '@openpeepshq/common/types';

import { BaseEmailLayout } from '../../BaseEmailLayout';
import { emailStyles } from '../../styles';

interface Props {
  globals: EmailGlobals;
}

export const Test = ({ globals }: Props) => {
  const { t } = globals.i18nContext;

  return (
    <BaseEmailLayout
      globals={globals}
      previewText={`Test Email - ${globals.communityConfig.info.name}`}
    >
      <Heading style={emailStyles.heading}>Test Email</Heading>

      <Text style={emailStyles.paragraph}>
        This is a test email from {globals.communityConfig.info.name}.
      </Text>

      <Text style={emailStyles.paragraph}>{t('emails.test.description')}</Text>

      <Section style={emailStyles.ctaContainer}>
        <Button href={globals.serverData.rootUrl} style={emailStyles.button}>
          Visit Site
        </Button>
      </Section>
    </BaseEmailLayout>
  );
};
