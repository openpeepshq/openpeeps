<script lang="ts">
	import type { EmailGlobals, PublicPost, PublicProfile } from '@openpeeps/common/types';
	import { Button, Heading, Link, Section, Text } from '@openpeeps/svelte5-email';
	import BaseEmailLayout from '../../../layout/BaseEmailLayout.svelte';
	import { emailStyles } from '$lib/components/styles';
	import { profileName } from '@openpeeps/common/lib';

	interface Props {
		globals: EmailGlobals;
		locals: {
			senderProfile: PublicProfile;
			recipientProfile: PublicProfile;
			post: PublicPost;
			previousPost: PublicPost | undefined;
			conversationStart: PublicPost;
		};
	}

	let { globals, locals }: Props = $props();
	const { t } = globals.i18nContext;
</script>

<BaseEmailLayout
	{globals}
	previewText={t('emails.pollVote.title', {
		communityName: globals.communityConfig.info.name
	})}
	showLogo={true}
	showGreeting={true}
	showAppLinks={true}
	showFooter={true}
>
	<Heading style={emailStyles.heading}>
		{t('emails.pollVote.title', {
			communityName: globals.communityConfig.info.name
		})}
	</Heading>
	<Text style={emailStyles.paragraph}>
		{t('emails.pollVote.body', {
			profileName: profileName(locals.senderProfile)
		})}
	</Text>
	<Text style={emailStyles.paragraph}>
		{locals.post.data?.content}
	</Text>
	<Section style={emailStyles.ctaContainer}>
		<Button href="{globals.serverData.rootUrl}/post/{locals?.post?.id}" style={emailStyles.button}>
			{t('emails.pollVote.cta')}
		</Button>
	</Section>
</BaseEmailLayout>
