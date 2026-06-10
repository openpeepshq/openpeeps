import { Button, Heading, Link, Section, Text } from '@react-email/components';
import { marked } from 'marked';
import type { EmailGlobals } from '@openpeeps/common/types';

import { BaseEmailLayout } from '../../BaseEmailLayout';
import { emailStyles } from '../../styles';

interface Props {
  globals: EmailGlobals;
}

export const Welcome = ({ globals }: Props) => {
  const { t } = globals.i18nContext;
  const welcomeMarkdown =
    globals.communityConfig.content?.welcomeEmail || 'Have fun!';
  const welcomeHtml = marked.parse(welcomeMarkdown, { async: false }) as string;

  return (
    <BaseEmailLayout
      globals={globals}
      previewText={`${t('emails.welcome.header')} ${globals.communityConfig.info.name}!`}
    >
      <Heading style={emailStyles.heading}>
        {t('emails.welcome.header')} {globals.communityConfig.info.name}!
      </Heading>

      <Text style={emailStyles.paragraph}>
        <span dangerouslySetInnerHTML={{ __html: welcomeHtml }} />
      </Text>

      <Text style={emailStyles.paragraph}>
        {t('emails.welcome.description')}:
      </Text>
      <Text style={emailStyles.paragraph}>
        <Link href={globals.serverData.rootUrl}>
          Visit {globals.communityConfig.info.name} now
        </Link>
      </Text>
      <Text style={emailStyles.paragraph}>
        <Link href={`${globals.serverData.rootUrl}/settings`}>
          {t('emails.welcome.content.profile')}
        </Link>{' '}
        {t('emails.welcome.content.friends')}
      </Text>
      <Text style={emailStyles.paragraph}>
        <Link href={`${globals.serverData.rootUrl}/settings/notifications`}>
          {t('emails.welcome.content.notification')}
        </Link>
      </Text>

      <Section style={emailStyles.ctaContainer}>
        <Button href={globals.serverData.rootUrl} style={emailStyles.button}>
          {t('emails.welcome.cta')}
        </Button>
      </Section>

      {globals.communityConfig.info.contactEmail && (
        <Text style={emailStyles.paragraph}>
          {t('emails.welcome.content.contact')}{' '}
          <Link
            href={`mailto:${globals.communityConfig.info.contactEmail}`}
            style={emailStyles.linkStyle}
          >
            {globals.communityConfig.info.contactEmail}
          </Link>{' '}
          {t('emails.welcome.content.mail')}
        </Text>
      )}
    </BaseEmailLayout>
  );
};
