<script lang="ts">
	import type { EmailGlobals } from '@openpeeps/common/types';
	import { Button, Heading, Link, Section, Text } from '@openpeeps/svelte5-email';
	import BaseEmailLayout from '../../../layout/BaseEmailLayout.svelte';
	import { emailStyles } from '$lib/components/styles';

	interface Props {
		globals: EmailGlobals;
	}

	let { globals }: Props = $props();
</script>

<BaseEmailLayout 
	{globals} 
	previewText="Test Email - {globals.communityConfig.info.name}"
	showLogo={true}
	showGreeting={false}
	showAppLinks={true}
	showFooter={true}
>
	<Heading style={emailStyles.heading}>Test Email</Heading>
	
	<Text style={emailStyles.paragraph}>
		This is a test email from {globals.communityConfig.info.name}.
	</Text>
	
	<Text style={emailStyles.paragraph}>
		If you're receiving this, it means your email configuration is working correctly!
	</Text>
	
	<Section style={emailStyles.ctaContainer}>
		<Button href="{globals.serverData.rootUrl}" style={emailStyles.button}>Visit Site</Button>
	</Section>
</BaseEmailLayout>
