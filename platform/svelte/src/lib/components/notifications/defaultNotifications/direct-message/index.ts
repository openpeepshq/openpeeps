import { profileName } from '@openpeeps/common/lib';
import component from './Email.svelte';
import type { EmailOptionsWithGlobals, ExpandedNotification, PublicProfile } from '@openpeeps/common/types';

const renderSubject = async (
	props: EmailOptionsWithGlobals & { locals: ExpandedNotification }
): Promise<string> => {
	const { t } = props.globals.i18nContext;

	return t('emails.directMessage.subject', {
		profileName: profileName(props.locals?.senderProfile as PublicProfile),
	});

}

export const email = {
	component,
	renderSubject
};
