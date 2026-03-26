import { profileName } from '@openpeeps/common';
import component from './Email.svelte';
import type { EmailOptionsWithGlobals, PublicPost, PublicProfile } from '@openpeeps/common/types';

const renderSubject = async (
	props: EmailOptionsWithGlobals & { locals: { post: PublicPost, senderProfile: PublicProfile } }
): Promise<string> => {
	const { t } = props.globals.i18nContext;

	return t('emails.jamStarted.subject', {
		profileName: profileName(props.locals.senderProfile),
		jamName: props.locals.post.data.content,

	});
}

export const email = {
	component,
	renderSubject
};
