import EventRsvpConfirmation from './EventRsvpConfirmation.svelte';
import type { EventRsvpConfirmationLocals } from './types';
import type { EmailOptionsWithGlobals } from '@openpeeps/common/types';

const renderSubject = async (
	props: EmailOptionsWithGlobals & { locals: EventRsvpConfirmationLocals },
): Promise<string> => {
	const { t } = props.globals.i18nContext;
	const eventName = props.locals.eventName;
	return props.locals.response === 'yes'
		? t('emails.eventRsvp.subjectYes', { eventName })
		: t('emails.eventRsvp.subjectMaybe', { eventName });
};

export default {
	component: EventRsvpConfirmation,
	renderSubject,
};
