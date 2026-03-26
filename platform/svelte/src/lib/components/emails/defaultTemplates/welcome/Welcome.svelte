<script lang="ts">
	import type { EmailGlobals } from '@openpeeps/common/types';
	import { Button, Heading, Link, Section, Text } from '@openpeeps/svelte5-email';
	import BaseEmailLayout from '../../../layout/BaseEmailLayout.svelte';
	import { OpenpeepsMarkdown } from '$lib/components/core';
	import { emailStyles } from '$lib/components/styles';

	interface Props {
		globals: EmailGlobals;
		
	}

	let { globals }: Props = $props();
	const { t } = globals.i18nContext;

</script>

<BaseEmailLayout 
	{globals} 
	previewText="{t('email.welcome.header')} {globals.communityConfig.info.name}!"
	showLogo={true}
	showGreeting={false}
	showAppLinks={true}
	showFooter={true}
>
	<Heading style={emailStyles.heading}>{t('email.welcome.header')} {globals.communityConfig.info.name}!</Heading>
	
	<Text style={emailStyles.paragraph}>
		<OpenpeepsMarkdown class='text-base' source={globals.communityConfig.content?.welcomeEmail || 'Have fun!'} />
	</Text>
	
	<Text style={emailStyles.paragraph}>{t('email.welcome.description')}:</Text>
		<Text style={emailStyles.paragraph}>
			<Link href={globals.serverData.rootUrl}>Visit {globals.communityConfig.info.name} now</Link>
		</Text>
		<Text style={emailStyles.paragraph}>
			<Link href="{globals.serverData.rootUrl}/settings">{t('email.welcome.content.profile')}</Link> {t('email.welcome.content.friends')}
		</Text>
		<Text style={emailStyles.paragraph}>
			<Link href="{globals.serverData.rootUrl}/settings/notifications"
				>{t('email.welcome.content.notification')}</Link
			>
		</Text>
	
	<Section style={emailStyles.ctaContainer}>
		<Button href="{globals.serverData.rootUrl}" style={emailStyles.button}>{t('email.welcome.cta')}</Button>
	</Section>

	{#if globals.communityConfig.info.contactEmail}
	<Text>
		{t('email.welcome.content.contact')} <Link
			href="mailto:{globals.communityConfig.info.contactEmail}"
			>{globals.communityConfig.info.contactEmail}
		</Link> {t('email.welcome.content.mail')}
	</Text>
	{/if}
</BaseEmailLayout>

