import component from './Email.svelte';
import type { EmailOptionsWithGlobals, PublicPost } from '@openpeeps/common/types';

const renderSubject = async (
	props: EmailOptionsWithGlobals & { locals: { post: PublicPost } }
): Promise<string> => {
	const { t } = props.globals.i18nContext;

	return t('emails.jamSpeaker.subject', {
		jamName: props.locals.post.data.content,
	});

}

export const email = {
	component,
	renderSubject
};
