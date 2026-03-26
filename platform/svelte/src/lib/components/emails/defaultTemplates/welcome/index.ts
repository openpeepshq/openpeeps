import Welcome from './Welcome.svelte';
import type { EmailOptionsWithGlobals } from '@openpeeps/common/types';

const renderSubject = async (props: EmailOptionsWithGlobals): Promise<string> =>
	`Welcome to ${props.globals.communityConfig.info.name}!`;

export default {
	component: Welcome,
	renderSubject
};
