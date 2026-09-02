import { Button, Heading, Section, Text } from '@react-email/components';
import type { EmailGlobals } from '@openpeepshq/common/types';
import { formatEventWhen } from '@openpeepshq/common/lib';

import { BaseEmailLayout } from '../../BaseEmailLayout';
import { emailStyles } from '../../styles';
import type { EventRsvpConfirmationLocals } from './types';

interface Props {
  globals: EmailGlobals;
  locals: EventRsvpConfirmationLocals;
}

export const EventRsvpConfirmation = ({ globals, locals }: Props) => {
  const { t, i18n } = globals.i18nContext;
  const heading =
    locals.response === 'yes'
      ? t('emails.eventRsvp.headingYes', { eventName: locals.eventName })
      : t('emails.eventRsvp.headingMaybe', { eventName: locals.eventName });
  const when = formatEventWhen(locals.start, {
    end: locals.end,
    timeZone: locals.timeZone,
    allDay: locals.allDay,
    locale: i18n.language,
  });

  return (
    <BaseEmailLayout
      globals={globals}
      previewText={heading}
      showGreeting={false}
    >
      <Heading style={emailStyles.heading}>{heading}</Heading>

      <Text style={emailStyles.paragraph}>{t('emails.eventRsvp.intro')}</Text>

      <Text style={emailStyles.paragraph}>
        <strong>{t('emails.eventRsvp.when')}:</strong> {when}
      </Text>

      {locals.location ? (
        <Text style={emailStyles.paragraph}>
          <strong>{t('emails.eventRsvp.where')}:</strong> {locals.location}
        </Text>
      ) : null}

      <Section style={emailStyles.ctaContainer}>
        <Button href={locals.eventUrl} style={emailStyles.button}>
          {t('emails.eventRsvp.cta')}
        </Button>
      </Section>
    </BaseEmailLayout>
  );
};
