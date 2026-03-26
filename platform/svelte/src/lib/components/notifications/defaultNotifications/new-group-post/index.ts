import { groupName, profileName } from '@openpeeps/common/lib';
import component from './Email.svelte';
import type { EmailOptionsWithGlobals, GroupData, PublicProfile } from '@openpeeps/common/types';

const renderSubject = async (
	props: EmailOptionsWithGlobals & { locals: { senderProfile: PublicProfile, group: GroupData } }
): Promise<string> => {
	const { t } = props.globals.i18nContext;

	return t('emails.newGroupPost.subject', {
		profileName: profileName(props.locals?.senderProfile as PublicProfile),
		groupName: groupName(props?.locals?.group as GroupData),
		communityName: props.globals.communityConfig.info.name
	});

}

export const email = {
	component,
	renderSubject
};
