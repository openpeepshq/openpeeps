import { Button, Heading, Section, Text } from '@react-email/components';
import type { EmailGlobals } from '@openpeeps/common/types';

import { BaseEmailLayout } from '../../BaseEmailLayout';
import { emailStyles } from '../../styles';

interface Props {
  globals: EmailGlobals;
  locals: { emailValidationLink: string };
}

export const ValidateEmail = ({ globals, locals }: Props) => {
  const { t } = globals.i18nContext;

  return (
    <BaseEmailLayout
      globals={globals}
      previewText={`${t('emails.verify.title')} - ${globals.communityConfig.info.name}`}
    >
      <Heading style={emailStyles.heading}>{t('emails.verify.title')}</Heading>

      <Text style={emailStyles.paragraph}>
        {t('emails.verify.welcome')} {globals.communityConfig.info.name}!{' '}
        {t('emails.verify.description')}
      </Text>

      <Section style={emailStyles.ctaContainer}>
        <Button href={locals.emailValidationLink} style={emailStyles.button}>
          {t('emails.verify.cta.description')}
        </Button>
      </Section>
    </BaseEmailLayout>
  );
};
