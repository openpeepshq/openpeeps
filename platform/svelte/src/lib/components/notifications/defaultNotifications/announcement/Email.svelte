<script lang="ts">
	import type { EmailGlobals, PublicPost, PublicProfile } from '@openpeeps/common/types';
	import { Button, Link, Section, Text, Hr, Container, Img } from '@openpeeps/svelte5-email';
	import BaseEmailLayout from '../../../layout/BaseEmailLayout.svelte';
	import { emailStyles } from '$lib/components/styles';
	import { getProfileAvatar, profileName } from '@openpeeps/common/lib';

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
	previewText="Announcement from {globals.communityConfig.info.name}"
	showLogo={true}
	showGreeting={true}
	showAppLinks={true}
	showFooter={true}
>
	<Text style={emailStyles.heading}>
		{t('emails.announcement.subject', {
			communityName: globals.communityConfig.info.name
		})}
	</Text>
	<Text style={emailStyles.paragraph}>
		<Link
			href="{globals.serverData.rootUrl}/@{locals?.senderProfile?.handle}"
			style={emailStyles.linkStyle}
		>
			@{locals?.senderProfile?.handle}
		</Link>
		{t('emails.announcement.body')}
	</Text>
	<Hr />
	{#if locals.post?.data?.content}
		<Container style={emailStyles.infoContainer}>
			<Img
				src={getProfileAvatar(locals.senderProfile, globals.communityConfig)}
				alt={profileName(locals.senderProfile) || ''}
				style={emailStyles.avatar}
				width="50"
				height="50"
			/>
			<Container>
				<Text style={emailStyles.username}>{profileName(locals.senderProfile)}</Text>
				<Text style={emailStyles.handle}>@{locals.senderProfile.handle}</Text>
			</Container>
		</Container>
	{/if}
	<Text style={emailStyles.paragraph}>
		{locals.post.data?.content}
	</Text>
	<Hr />

	<Section style={emailStyles.ctaContainer}>
		<Button href="{globals.serverData.rootUrl}/posts/{locals?.post.id}" style={emailStyles.button}>
			{t('emails.announcement.cta')}
		</Button>
	</Section>
</BaseEmailLayout>
