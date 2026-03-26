import type { EmailOptionsWithGlobals, GroupData } from '@openpeeps/common/types';
import component from './Email.svelte';
import { groupName } from '@openpeeps/common/lib';

const renderSubject = async (props: EmailOptionsWithGlobals): Promise<string> => {
	const { t } = props.globals.i18nContext;
	return t('emails.groupAdded.subject', {
		communityName: props.globals.communityConfig.info.name,
		groupName: groupName(props?.locals?.group as GroupData)
	});
}

export const email = {
	component,
	renderSubject
};
