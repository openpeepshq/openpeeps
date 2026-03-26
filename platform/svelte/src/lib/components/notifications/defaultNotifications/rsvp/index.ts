import component from './Email.svelte';
import type { EmailOptionsWithGlobals } from '@openpeeps/common/types';

const renderSubject = async (props: EmailOptionsWithGlobals): Promise<string> => {
	const { t } = props.globals.i18nContext;

	return t('emails.rsvp.subject', {
		communityName: props.globals.communityConfig.info.name
	});
}

export const email = {
	component,
	renderSubject
};
