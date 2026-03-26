<script lang="ts">
	import { eventRsvpMutation, me } from '$lib/api';
	import type { PublicPost, Event } from '@openpeeps/common/types';
	import { Button } from '@openpeeps/ui';
	import { getToastStore } from '@skeletonlabs/skeleton';
	import { i18nContext } from '@openpeeps/svelte/components/i18n';
	import { calculateEffectiveRsvps } from '@openpeeps/common';

	interface Props {
		post: PublicPost;
	}

	let { post }: Props = $props();
	const toastStore = getToastStore();
	const { t } = i18nContext();
	const myEvent = $derived(post.profile?.id === $me?.id);
	const myRsvp = $derived(calculateEffectiveRsvps(post).find((r) => r.profile.id === $me?.id));

	const rsvpToEvent = eventRsvpMutation({ id: post.id });

	const handleRegister = async () => {
		if (myEvent) return;
		rsvpToEvent({ response: 'yes' })
			.then(() => {
				toastStore.trigger({
					message: t('posts.rsvp.success'),
					background: 'variant-filled-success'
				});
			})
			.catch((error) => {
				toastStore.trigger({
					message: t('posts.rsvp.error', { error: error.message }),
					background: 'variant-filled-error'
				});
			});
	};

	const handleMaybe = async () => {
		if (myEvent) return;
		rsvpToEvent({ response: 'tentative' })
			.then(() => {
				toastStore.trigger({
					message: t('posts.rsvp.success'),
					background: 'variant-filled-success'
				});
			})
			.catch((error) => {
				toastStore.trigger({
					message: t('posts.rsvp.error', { error: error.message }),
					background: 'variant-filled-error'
				});
			});
	};

	const handleNo = async () => {
		if (myEvent) return;
		await rsvpToEvent({ response: 'no' })
			.then(() => {
				toastStore.trigger({
					message: t('posts.rsvp.success'),
					background: 'variant-filled-success'
				});
			})
			.catch((error) => {
				toastStore.trigger({
					message: t('posts.rsvp.error', { error: error.message }),
					background: 'variant-filled-error'
				});
			});
	};
</script>

{#if !myEvent}
	{#if myRsvp && myRsvp.response !== 'no'}
		<div class="w-full">
			<Button variant="variant-ringed-secondary" class="text-error-500 w-full" action={handleNo}>
				{t('posts.rsvp.cancelRegistration')}</Button
			>
			<p class="mt-2 text-center">
				{myRsvp.response === 'yes'
					? t('posts.rsvp.attendingMessage')
					: t('posts.rsvp.maybeMessage')}
			</p>
		</div>
	{:else}
		<div class="mt-4 flex w-full gap-x-2">
			<Button variant="variant-filled-primary" action={handleRegister} class="w-[70%]"
				>{t('posts.rsvp.register')}</Button
			>
			<Button variant="variant-ghost-primary" action={handleMaybe}>{t('posts.rsvp.maybe')}</Button>
			<Button variant="variant-ringed-primary" action={handleNo}>{t('posts.rsvp.no')}</Button>
		</div>
	{/if}
{/if}
