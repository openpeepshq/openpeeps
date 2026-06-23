import { groupName, profileName } from '@openpeeps/common/lib';
import component from './Email.svelte';
import type {
	EmailOptionsWithGlobals,
	ExpandedNotification,
} from '@openpeeps/common/types';

const renderSubject = async (
	props: EmailOptionsWithGlobals & { locals: ExpandedNotification },
): Promise<string> => {
	const { t } = props.globals.i18nContext;

	return t('emails.newGroupPost.subject', {
		profileName: profileName(props.locals.senderProfile ?? undefined),
		groupName: groupName(props.locals.group ?? undefined),
		communityName: props.globals.communityConfig.info.name,
	});
};

export const email = {
	component,
	renderSubject
};
