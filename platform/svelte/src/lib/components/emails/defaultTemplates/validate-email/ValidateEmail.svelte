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
	previewText="{t('email.verify.title')} - {globals.communityConfig.info.name}"
	showLogo={true}
	showGreeting={false}
	showAppLinks={true}
	showFooter={true}
>
	<Heading style={emailStyles.heading}>{t('email.verify.title')}</Heading>
	
	<Text style={emailStyles.paragraph}>
		{t('email.verify.welcome')} {globals.communityConfig.info.name}! {t('email.verify.description')}
	</Text>
	
	<Section style={emailStyles.ctaContainer}>
		<Button href={locals.emailValidationLink} style={emailStyles.button}>{t('email.verify.cta.description')}</Button>
	</Section>
</BaseEmailLayout>
