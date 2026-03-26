import type { EmailOptionsWithGlobals, GroupData, PublicProfile } from '@openpeeps/common/types';
import component from './Email.svelte';
import { groupName, profileName } from '@openpeeps/common/lib';

const renderSubject = async (props: EmailOptionsWithGlobals): Promise<string> => {
	const { t } = props.globals.i18nContext;

	return t('emails.groupMemberLeft.subject', {
		profileName: profileName(props.locals?.senderProfile as PublicProfile),
		groupName: groupName(props?.locals?.group as GroupData),
		communityName: props.globals.communityConfig.info.name
	});
}

export const email = {
	component,
	renderSubject
};
