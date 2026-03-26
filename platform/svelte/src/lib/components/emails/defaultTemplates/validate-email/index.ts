import ValidateEmail from './ValidateEmail.svelte';
import type { EmailOptionsWithGlobals } from '@openpeeps/common/types';

const renderSubject = async (props: EmailOptionsWithGlobals): Promise<string> =>
	`Validate your email for ${props.globals.communityConfig.info.name}!`;

export default {
	component: ValidateEmail,
	renderSubject
};
