import type { EmailOptionsWithGlobals } from '@openpeeps/common/types';
import { render } from 'svelte/server';

export { default as welcomeEmail } from './defaultTemplates/welcome';
export { default as testEmail } from './defaultTemplates/test';
export { default as validateEmailEmail } from './defaultTemplates/validate-email';
export { default as resetPasswordEmail } from './defaultTemplates/reset-password';
export { default as eventRsvpConfirmationEmail } from './defaultTemplates/event-rsvp-confirmation';

import type { SvelteEmailTemplate } from '$lib/types';

export const svelteEmailRenderer =
	<Locals>(svelteEmailTemplate: SvelteEmailTemplate<Locals>) =>
	async (emailOptions: EmailOptionsWithGlobals) => {
		const rendered = render(svelteEmailTemplate.component, {
			props: {
				globals: emailOptions.globals,
				locals: emailOptions.locals as Locals
			}
		});
		const subject = await svelteEmailTemplate.renderSubject(
			emailOptions as EmailOptionsWithGlobals & { locals: Locals }
		);
		const html = rendered.body;

		return { html, subject };
	};
