import { Button, Heading, Section, Text } from '@react-email/components';
import type { EmailGlobals } from '@openpeepshq/common/types';

import { BaseEmailLayout } from '../../BaseEmailLayout';
import { emailStyles } from '../../styles';

interface Props {
  globals: EmailGlobals;
  locals: { resetPasswordLink: string };
}

export const ResetPassword = ({ globals, locals }: Props) => {
  const { t } = globals.i18nContext;

  return (
    <BaseEmailLayout
      globals={globals}
      previewText={t('emails.reset.password.title')}
    >
      <Heading style={emailStyles.heading}>
        {t('emails.reset.password.title')}
      </Heading>

      <Text style={emailStyles.paragraph}>
        {t('emails.reset.password.description', {
          communityName: globals.communityConfig.info.name,
        })}
      </Text>

      <Section style={emailStyles.ctaContainer}>
        <Button href={locals.resetPasswordLink} style={emailStyles.button}>
          {t('emails.reset.password.cta')}
        </Button>
      </Section>
    </BaseEmailLayout>
  );
};
