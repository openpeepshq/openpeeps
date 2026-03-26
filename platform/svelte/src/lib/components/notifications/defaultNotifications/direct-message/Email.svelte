<script lang="ts">
	import type { Profile, EmailGlobals, PublicPost, PublicProfile } from '@openpeeps/common/types';
	import { Button, Link, Section, Text } from '@openpeeps/svelte5-email';
	import BaseEmailLayout from '../../../layout/BaseEmailLayout.svelte';
	import { emailStyles } from '$lib/components/styles';
	import { profileName, truncateText } from '@openpeeps/common/lib';

	interface Props {
		globals: EmailGlobals;
		locals: {
			senderProfile: Profile;
			recipientProfile: PublicProfile;
			post: PublicPost;
			data: {
				previousPost: PublicPost | undefined;
				conversationStart: PublicPost;
			};
		};
	}

	let { globals, locals }: Props = $props();

	const hasMultipleRecipients = locals.post.mentions.length > 2;
	const isReply = !!locals.data.previousPost;
	const { t } = globals.i18nContext;

	// Custom styling for message content
	const messageContent = {
		...emailStyles.paragraph,
		color: '#2d3748',
		backgroundColor: '#f7fafc',
		border: '1px solid #e2e8f0',
		borderRadius: '8px',
		padding: '16px',
		margin: '16px 0'
	};
</script>

<BaseEmailLayout
	{globals}
	previewText="Direct message from {globals.communityConfig.info.name}"
	showLogo={true}
	showGreeting={true}
	showAppLinks={true}
	showFooter={true}
	recipientProfile={locals.recipientProfile}
>
	{#if isReply}
		<Text style={emailStyles.paragraph}>
			{t('emails.directMessage.title', {
				profileName: profileName(locals.senderProfile as any)
			})}
		</Text>

		<Text style={messageContent}>
			{truncateText(locals.data.previousPost?.data?.content || '', 30)}
		</Text>

		<Text style={emailStyles.paragraph}>
			{t('emails.directMessage.replySubtitle')}
		</Text>

		<Text style={messageContent}>
			{locals.post.data?.content}
		</Text>
	{:else}
		<Text style={emailStyles.paragraph}>
			<Link
				href="{globals.serverData.rootUrl}/@{locals.senderProfile.handle}"
				style={emailStyles.linkStyle}
			>
				@{locals.senderProfile.handle}
			</Link>
			{hasMultipleRecipients
				? t('emails.directMessage.multipleRecipientsBody', {
						membersCount: locals.post.mentions.length - 2
					})
				: t('emails.directMessage.singleRecipientBody')}
		</Text>

		{#if locals.data.previousPost?.data?.content}
			<Text style={messageContent}>
				{truncateText(locals.data.previousPost?.data?.content || '', 30)}
			</Text>
		{:else}
			<Text style={messageContent}>
				{locals.post.data?.content}
			</Text>
		{/if}
	{/if}

	<Section style={emailStyles.ctaContainer}>
		<Button
			href="{globals.serverData.rootUrl}/conversations/{locals.data.conversationStart.id}"
			style={emailStyles.button}
		>
			{t('emails.directMessage.cta')}
		</Button>
	</Section>
</BaseEmailLayout>
