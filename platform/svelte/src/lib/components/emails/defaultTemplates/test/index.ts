import Test from './Test.svelte';
import type { EmailOptionsWithGlobals } from '@openpeeps/common/types';

const renderSubject = async (props: EmailOptionsWithGlobals): Promise<string> =>
	`Test email from ${props.globals.communityConfig.info.name}!`;

export default {
	component: Test,
	renderSubject
};
