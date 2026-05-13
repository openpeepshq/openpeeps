<script lang="ts">
	import type { Event, PublicPost } from '@openpeeps/common/types';

	import { Button, Timespan } from '@openpeeps/ui';
	import EventLocation from '../../pieces/EventLocation.svelte';

	interface Props {
		post: PublicPost;
	}

	let { post }: Props = $props();
	let event = $derived(post.data as Event);
</script>

{#if post?.data?.type === 'event'}
	<div class="flex w-full flex-col gap-2">
		{#if event.image}
			<span class="aspect-video w-full overflow-hidden">
				<img src={event.image} class="h-full w-full object-cover" alt="image for {event.name}" />
			</span>
		{/if}
		<div class="flex w-full items-center justify-between">
			<span class="text-error-600">
				<Timespan start={event.start} end={event.end} />
				(your local time)
			</span>
			<Button action="/posts/{post?.id}" variant="variant-ringed-primary">View Event</Button>
		</div>
		<div>{event.name}</div>
		<EventLocation {post} />
	</div>
{:else}
	<h1>
		This Feed-Event Component was used but the post type on the server is not of type "event".
		Please report this to the Developers
	</h1>
{/if}
