<script lang="ts">
	import type { EmailGlobals, ExpandedNotification } from '@openpeeps/common/types';
	import { Heading, Section, Text, Link, Button } from '@openpeeps/svelte5-email';
	import BaseEmailLayout from '../../../layout/BaseEmailLayout.svelte';
	import { emailStyles } from '$lib/components/styles';
	import { profileName } from '@openpeeps/common/lib';

	interface Props {
		globals: EmailGlobals;
		locals: ExpandedNotification;
	}

	let { globals, locals }: Props = $props();
	const { t } = globals.i18nContext;
</script>

<BaseEmailLayout 
	{globals} 
	previewText={t('emails.newProfile.title', {
		communityName: globals.communityConfig.info.name
	})}
	showLogo={true}
	showGreeting={true}
	showAppLinks={true}
	showFooter={true}
>
	<Heading style={emailStyles.heading}>
		{t('emails.newProfile.title', {
			communityName: globals.communityConfig.info.name
		})}</Heading
	>
	<Section>
		<Text style={emailStyles.paragraph}>
			{t('emails.newProfile.body', {
				profileName: locals.senderProfile ? profileName(locals.senderProfile) : '',
				communityName: globals.communityConfig.info.name
			})}
		</Text>
	</Section>
	<Section style={emailStyles.ctaContainer}>
		<Button href="{globals.serverData.rootUrl}/@{locals.senderProfile?.handle}" 
		style={emailStyles.button}>{t('emails.welcome.cta')}</Button>
	</Section>
</BaseEmailLayout>
