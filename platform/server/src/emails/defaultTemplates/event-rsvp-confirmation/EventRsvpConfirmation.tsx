import { Button, Heading, Section, Text } from '@react-email/components';
import type { EmailGlobals } from '@openpeepshq/common/types';

import { BaseEmailLayout } from '../../BaseEmailLayout';
import { emailStyles } from '../../styles';
import type { EventRsvpConfirmationLocals } from './types';

interface Props {
  globals: EmailGlobals;
  locals: EventRsvpConfirmationLocals;
}

const formatWhen = (
  start: string,
  end?: string | null,
  allDay?: boolean,
): string => {
  const dateOptions: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  };
  const dateTimeOptions: Intl.DateTimeFormatOptions = {
    ...dateOptions,
    hour: '2-digit',
    minute: '2-digit',
  };
  const options = allDay ? dateOptions : dateTimeOptions;
  const startLabel = new Date(start).toLocaleString(undefined, options);
  if (!end) {
    return startLabel;
  }
  const endLabel = new Date(end).toLocaleString(undefined, options);
  return `${startLabel} – ${endLabel}`;
};

export const EventRsvpConfirmation = ({ globals, locals }: Props) => {
  const { t } = globals.i18nContext;
  const heading =
    locals.response === 'yes'
      ? t('emails.eventRsvp.headingYes', { eventName: locals.eventName })
      : t('emails.eventRsvp.headingMaybe', { eventName: locals.eventName });
  const when = formatWhen(locals.start, locals.end, locals.allDay);

  return (
    <BaseEmailLayout globals={globals} previewText={heading} showGreeting={false}>
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
