import type { EmailOptionsWithGlobals } from '@openpeepshq/common/types';

import type { ReactEmailTemplate } from '../../types';
import { EventRsvpConfirmation } from './EventRsvpConfirmation';
import type { EventRsvpConfirmationLocals } from './types';

const renderSubject = async (
  props: EmailOptionsWithGlobals & { locals: EventRsvpConfirmationLocals },
): Promise<string> => {
  const { t } = props.globals.i18nContext;
  const eventName = props.locals.eventName;
  return props.locals.response === 'yes'
    ? t('emails.eventRsvp.subjectYes', { eventName })
    : t('emails.eventRsvp.subjectMaybe', { eventName });
};

const template: ReactEmailTemplate<EventRsvpConfirmationLocals> = {
  component: EventRsvpConfirmation,
  renderSubject,
};

export default template;
