<script lang="ts">
	import type { EmailGlobals, ExpandedNotification } from '@openpeeps/common/types';
	import { Heading, Section, Text, Link, Button } from '@openpeeps/svelte5-email';
	import BaseEmailLayout from '../../../layout/BaseEmailLayout.svelte';
	import { emailStyles } from '$lib/components/styles';
	import { groupName, profileName } from '@openpeeps/common/lib';

	interface Props {
		globals: EmailGlobals;
		locals: ExpandedNotification;
	}

	let { globals, locals }: Props = $props();
	const { t } = globals.i18nContext;
</script>

<BaseEmailLayout 
	{globals} 
	previewText={t('emails.groupMemberLeft.title', {
		profileName: locals.senderProfile ? profileName(locals.senderProfile) : '',
		groupName: locals.group ? groupName(locals.group) : '',
		communityName: globals.communityConfig.info.name
	})}
	showLogo={true}
	showGreeting={true}
	showAppLinks={true}
	showFooter={true}
>
	<Heading style={emailStyles.heading}>
		{t('emails.groupMemberLeft.title', {
			profileName: locals.senderProfile ? profileName(locals.senderProfile) : '',
			groupName: locals.group ? groupName(locals.group) : '',
			communityName: globals.communityConfig.info.name
		})}
	</Heading>
	<Section>
		<Text style={emailStyles.paragraph}>
			{t('emails.groupMemberLeft.body', {
				profileName: locals.senderProfile ? profileName(locals.senderProfile) : '',
				groupName: locals.group ? groupName(locals.group) : ''
			})}
		</Text>
		<Text style={emailStyles.paragraph}>
			<Link href="{globals.serverData.rootUrl}/@{locals.senderProfile?.handle}" style={emailStyles.linkStyle}
				>{t('emails.groupMemberLeft.profileCta')}</Link
			>
		</Text>
	</Section>
	<Section style={emailStyles.ctaContainer}>
		<Button 
			href="{globals.serverData.rootUrl}/groups/@{locals.group?.handle}" 
			style={emailStyles.button}
		>
		{t('emails.groupMemberLeft.cta')}
		</Button>
	</Section>
</BaseEmailLayout>
