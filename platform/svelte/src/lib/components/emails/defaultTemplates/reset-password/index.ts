import component from './ResetPassword.svelte';
import type { EmailOptionsWithGlobals } from '@openpeeps/common/types';

const renderSubject = async (props: EmailOptionsWithGlobals): Promise<string> =>
	`Reset your password for ${props.globals.communityConfig.info.name}!`;

export default {
	component,
	renderSubject
};
