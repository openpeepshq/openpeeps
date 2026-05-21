<script lang="ts">
	// @ts-nocheck
	import type { Event, PublicPost } from '@openpeeps/common/types';
	import { i18nContext } from '$lib/components/i18n';
	import { getCurrentProfile } from '$lib/auth';
	import { calculateEffectiveRsvps } from '@openpeeps/common';
	const { t } = i18nContext();

	interface Props {
		post: PublicPost;
	}

	const { post }: Props = $props();
	const event = $derived(post.data as Event);
	const me = getCurrentProfile();
	const myEvent = $derived(post.profile?.id === me?.id);
	const iAmModerator = $derived(event.moderators?.includes(me?.id));
	const myRsvp = $derived(calculateEffectiveRsvps(post).find((rsvp) => me?.id === rsvp.profile.id));
</script>

{#if myEvent}
	<div class="variant-ghost-primary rounded-2xl px-2">
		<span class="text-background text-center text-sm">
			{t('events.profileRelationship.owner')}
		</span>
	</div>
{:else if iAmModerator}
	<div class="variant-ghost-primary rounded-2xl px-2">
		<span class="text-center text-sm">
			{t('events.profileRelationship.moderator')}
		</span>
	</div>
{:else if myRsvp?.response === 'yes'}
	<div class="variant-ghost-tertiary rounded-2xl px-2">
		<span class="text-foreground text-center text-sm">
			{t('events.profileRelationship.attending')}
		</span>
	</div>
{:else if myRsvp?.response === 'tentative'}
	<div class="variant-ghost-surface rounded-2xl px-2">
		<span class="text-foreground text-center text-sm">
			{t('events.profileRelationship.tentative')}
		</span>
	</div>
{/if}
