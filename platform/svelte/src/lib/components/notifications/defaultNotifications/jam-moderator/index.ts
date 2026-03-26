import component from './Email.svelte';
import type { EmailOptionsWithGlobals, PublicPost } from '@openpeeps/common/types';
import { i18nContext } from '$lib/components/i18n';

const renderSubject = async (
	props: EmailOptionsWithGlobals & { locals: { post: PublicPost } }
): Promise<string> => {
	const { t } = i18nContext();

	return t('emails.jamModerator.subject', {
		jamName: props.locals.post.data.content,
	});

}

export const email = {
	component,
	renderSubject
};
