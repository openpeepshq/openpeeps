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
	previewText={t('emails.jamSpeaker.body', {
		profileName: profileName(locals.senderProfile)
	})}
	showLogo={true}
	showGreeting={true}
	showAppLinks={true}
	showFooter={true}
>
	<Text style={emailStyles.heading}>{t('emails.jams.speaker')}</Text>
	<Container style={emailStyles.contentContainer}>
		<Container style={emailStyles.profileIcons}>
			<User />
			<Img
				src={getProfileAvatar(locals.senderProfile, globals.communityConfig)}
				alt={profileName(locals.senderProfile) || ''}
				style={emailStyles.avatar}
				width="44"
				height="44"
			/>
		</Container>
		<Text style={emailStyles.paragraph}>
			{t('emails.jams.speaker.description', {
				jamName: event?.name
			})}
		</Text>
	</Container>

	<Section style={emailStyles.ctaContainer}>
		<Button href={getJamUrl(locals.post.id, globals.serverData.rootUrl)} style={emailStyles.button}>
			{t('emails.jamSpeaker.cta')}
		</Button>
	</Section>
</BaseEmailLayout>
