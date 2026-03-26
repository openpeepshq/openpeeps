<script lang="ts">
	import type { EmailGlobals, ExpandedNotification } from '@openpeeps/common/types';
	import { Button, Link, Section, Text } from '@openpeeps/svelte5-email';
	import BaseEmailLayout from '../../../layout/BaseEmailLayout.svelte';
	import { emailStyles } from '$lib/components/styles';

	interface Props {
		globals: EmailGlobals;
		locals: ExpandedNotification;
	}

	let { globals, locals }: Props = $props();
	const { t } = globals.i18nContext;


</script>

<BaseEmailLayout 
	{globals} 
	previewText={t('emails.follow.body')}
	showLogo={true}
	showGreeting={true}
	showAppLinks={true}
	showFooter={true}
>
	<Text style={emailStyles.paragraph}>
		<Link href="{globals.serverData.rootUrl}/@{locals.senderProfile?.handle}" style={emailStyles.linkStyle}>
			@{locals.senderProfile?.handle}
		</Link>
		{t('emails.follow.body')}
	</Text>
	
	<Section style={emailStyles.ctaContainer}>
		<Button 
			href="{globals.serverData.rootUrl}/@{locals.senderProfile?.handle}" 
			style={emailStyles.button}
			pX={24} 
			pY={12}
		>
			{t('emails.follow.cta')}
		</Button>
	</Section>
</BaseEmailLayout>
