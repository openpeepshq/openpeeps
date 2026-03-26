<script lang="ts">
	import type {
		Profile,
		EmailGlobals,
		PublicPost,
		GroupData,
		PublicProfile
	} from '@openpeeps/common/types';
	import { Link, Section, Text, Heading, Button } from '@openpeeps/svelte5-email';
	import BaseEmailLayout from '../../../layout/BaseEmailLayout.svelte';
	import { emailStyles } from '$lib/components/styles';
	import { groupName, profileName } from '@openpeeps/common/lib';

	interface Props {
		globals: EmailGlobals;
		locals: {
			senderProfile: PublicProfile;
			post: PublicPost;
			recipientProfile: PublicProfile;
			group: GroupData;
			data: {
				replyPost: PublicPost;
			};
		};
	}

	let { globals, locals }: Props = $props();
	const { t } = globals.i18nContext;
</script>

<BaseEmailLayout 
	{globals} 
	previewText={t('emails.newGroupPost.title', {
		profileName: profileName(locals.senderProfile),
		groupName: groupName(locals.group),
		communityName: globals.communityConfig.info.name
	})}
	showLogo={true}
	showGreeting={true}
	showAppLinks={true}
	showFooter={true}
>
	<Heading style={emailStyles.heading}>
		{t('emails.newGroupPost.title', {
			profileName: profileName(locals.senderProfile),
			groupName: groupName(locals.group),
			communityName: globals.communityConfig.info.name
		})}
	</Heading>
	<Section>
		<Text style={emailStyles.paragraph}>
			{t('emails.newGroupPost.body', {
				profileName: profileName(locals.senderProfile),
				groupName: groupName(locals.group)
			})}
		</Text>
		<Text style={emailStyles.paragraph}>
			<Link href="{globals.serverData.rootUrl}/@{locals.senderProfile?.handle}" style={emailStyles.linkStyle}
				>{t('emails.newGroupPost.profileCta')}</Link
			>
		</Text>
		<Text style={emailStyles.paragraph}>
			<Link href="{globals.serverData.rootUrl}/posts/{locals.post.id}" style={emailStyles.linkStyle}
				>{t('emails.newGroupPost.postCta')}</Link
			>
		</Text>
	</Section>
	<Section style={emailStyles.ctaContainer}>
		<Button 
			href="{globals.serverData.rootUrl}/groups/@{locals.group?.handle}" 
			style={emailStyles.button}
		>
		{t('emails.newGroupPost.cta')}
		</Button>
	</Section>
</BaseEmailLayout>
