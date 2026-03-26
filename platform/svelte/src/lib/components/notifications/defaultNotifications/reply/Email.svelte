<script lang="ts">
	import type { EmailGlobals, PublicPost, PublicProfile } from '@openpeeps/common/types';
	import { Button, Container, Img, Link, Section, Text } from '@openpeeps/svelte5-email';
	import BaseEmailLayout from '../../../layout/BaseEmailLayout.svelte';
	import { emailStyles } from '$lib/components/styles';
	import { getProfileAvatar, profileName, truncateText } from '@openpeeps/common/lib';

	interface Props {
		globals: EmailGlobals;
		locals: {
			senderProfile: PublicProfile;
			post: PublicPost;
			recipientProfile: PublicProfile;
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
	previewText={t('emails.reply.body', {
		profileName: profileName(locals.senderProfile)
	})}
	showLogo={true}
	showGreeting={true}
	showAppLinks={true}
	showFooter={true}
>
	<Text style={emailStyles.heading}>
		{t('emails.reply.body', {
			profileName: profileName(locals.senderProfile)
		})}</Text
	>
	{#if locals.post?.data?.content}
		<Container style={emailStyles.infoContainer}>
			<Img
				src={getProfileAvatar(locals.senderProfile, globals.communityConfig)}
				alt={profileName(locals.senderProfile) || ''}
				style={emailStyles.avatar}
				width="50"
				height="50"
			/>
			<Container style={emailStyles.messageCard}>
				<Container>
					<Text style={emailStyles.username}>{profileName(locals.senderProfile)}</Text>
					<Text style={emailStyles.handle}>@{locals.senderProfile.handle}</Text>
				</Container>
				<Text>
					{truncateText(locals.data.replyPost.data.content, 30)}
				</Text>
			</Container>
		</Container>
	{/if}
	<Section style={emailStyles.ctaContainer}>
		<Button
			href="{globals.serverData.rootUrl}/posts/{locals.data.replyPost.id}"
			style={emailStyles.button}
		>
			{t('emails.reply.cta')}
		</Button>
	</Section>
</BaseEmailLayout>
