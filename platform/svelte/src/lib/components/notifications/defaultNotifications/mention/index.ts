import component from './Email.svelte';
import type { EmailOptionsWithGlobals, PublicProfile } from '@openpeeps/common/types';
import { profileName } from '@openpeeps/common/lib';

const renderSubject = async (
	props: EmailOptionsWithGlobals & { locals: { senderProfile: PublicProfile } }
): Promise<string> => {
	const { t } = props.globals.i18nContext;

	return t('emails.mention.subject', {
		profileName: profileName(props.locals.senderProfile),
		communityName: props.globals.communityConfig.info.name
	});
};

export const email = {
	component,
	renderSubject
};
