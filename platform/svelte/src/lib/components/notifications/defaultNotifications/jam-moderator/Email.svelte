<script lang="ts">
	import type { EmailGlobals, PublicPost, Event, PublicProfile } from '@openpeeps/common/types';
	import { Button, Container, Img, Section, Text } from '@openpeeps/svelte5-email';
	import BaseEmailLayout from '../../../layout/BaseEmailLayout.svelte';
	import { emailStyles } from '$lib/components/styles';
	import { getJamUrl, getProfileAvatar, profileName } from '@openpeeps/common/lib';
	import { User } from 'lucide-svelte';
	interface Props {
		globals: EmailGlobals;
		locals: {
			recipientProfile: PublicProfile;
			senderProfile: PublicProfile;
			post: PublicPost;
		};
	}

	let { globals, locals }: Props = $props();
	const event = locals.post.data as Event;
	const { t } = globals.i18nContext;
</script>

<BaseEmailLayout
	{globals}
	previewText={t('emails.jamModerator.body', {
		profileName: profileName(locals.senderProfile)
	})}
	showLogo={true}
	showGreeting={true}
	showAppLinks={true}
	showFooter={true}
>
	<Text style={emailStyles.heading}>{t('email.jams.moderator')}</Text>
	<Container style={emailStyles.contentContainer}>
		<Container style={emailStyles.profileIcons}>
			<User />
			<Img
				src={getProfileAvatar(locals.senderProfile, globals.communityConfig)}
				alt={profileName(locals.senderProfile) || ''}
				style={emailStyles.avatar}
				width="50"
				height="50"
			/>
		</Container>
		<Text style={emailStyles.paragraph}>
			{t('email.jams.moderator.description', {
				profileName: profileName(locals.senderProfile)
			})}
		</Text>
	</Container>

	<Section style={emailStyles.ctaContainer}>
		<Button href={getJamUrl(locals.post.id, globals.serverData.rootUrl)} style={emailStyles.button}>
			{t('emails.jamModerator.cta')}
		</Button>
	</Section>
</BaseEmailLayout>
