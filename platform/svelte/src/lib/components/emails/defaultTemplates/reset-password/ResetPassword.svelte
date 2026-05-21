<script lang="ts">
	// @ts-nocheck
	import type { EmailGlobals } from '@openpeeps/common/types';
	import { Button, Heading, Section, Text } from '@openpeeps/svelte5-email';
	import { emailStyles } from '$lib/components/styles';
	import BaseEmailLayout from '$lib/components/layout/BaseEmailLayout.svelte';

	interface Props {
		globals: EmailGlobals;
		resetPasswordLink: string;
	}

	let { globals, locals }: Props = $props();
	const { t } = globals.i18nContext;
</script>

<BaseEmailLayout 
	{globals} 
	previewText={t('emails.reset.password.title')}
	showLogo={true}
	showGreeting={false}
	showAppLinks={true}
	showFooter={true}
>
	<Heading style={emailStyles.heading}>
		{t('emails.reset.password.title')}
	</Heading>
	
	<Text style={emailStyles.paragraph}>
		{t('emails.reset.password.description', {
			communityName: globals.communityConfig.info.name
		})}
	</Text>
	<Section style={emailStyles.ctaContainer}>
		<Button href={locals.resetPasswordLink} style={emailStyles.button}>
			{t('emails.reset.password.cta')}
		</Button>
	</Section>
	
</BaseEmailLayout>
