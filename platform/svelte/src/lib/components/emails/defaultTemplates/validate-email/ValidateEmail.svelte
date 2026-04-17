<script lang="ts">
	import type { EmailGlobals } from '@openpeeps/common/types';
	import { Button, Heading, Link, Section, Text } from '@openpeeps/svelte5-email';
	import BaseEmailLayout from '../../../layout/BaseEmailLayout.svelte';
	import { emailStyles } from '$lib/components/styles';

	
	interface Props {
		globals: EmailGlobals;
		locals: { emailValidationLink: string };
	}

	let { globals, locals }: Props = $props();
	const { t } = globals.i18nContext;

</script>

<BaseEmailLayout 
	{globals} 
	previewText="{t('emails.verify.title')} - {globals.communityConfig.info.name}"
	showLogo={true}
	showGreeting={false}
	showAppLinks={true}
	showFooter={true}
>
	<Heading style={emailStyles.heading}>{t('emails.verify.title')}</Heading>
	
	<Text style={emailStyles.paragraph}>
		{t('emails.verify.welcome')} {globals.communityConfig.info.name}! {t('emails.verify.description')}
	</Text>
	
	<Section style={emailStyles.ctaContainer}>
		<Button href={locals.emailValidationLink} style={emailStyles.button}>{t('emails.verify.cta.description')}</Button>
	</Section>
</BaseEmailLayout>
