<script lang="ts">
	import type { Event, PublicPost } from '@openpeeps/common/types';
	import { Link } from '@openpeeps/ui';
	import { ExternalLink, LinkIcon, MapPin, PhoneCall } from 'lucide-svelte';
	import { getJamUrl, truncateText } from '@openpeeps/common/lib';
	import { page } from '$app/state';
	interface Props {
		post: PublicPost;
		preview?: boolean;
		truncate?: boolean;
	}
	let { post, preview = true, truncate = false }: Props = $props();
	const event = $derived(post.data as Event);

	const jamLink = `${page.url.origin}/events/${post.id}/jam`;
</script>

{#if preview}
	<div class="flex items-center gap-1">
		{#if event.physicalLocation}
			<MapPin class="h-4 w-4" />
			{truncate ? truncateText(event.physicalLocation.text) : event.physicalLocation.text}
		{:else if event.jam}
			<PhoneCall class="h-4 w-4" />
			<Link action={getJamUrl(post.id, page.url.origin)} newTab>Jam Event</Link>
		{:else if event.url}
			<LinkIcon class="h-4 w-4" />
			<Link action={event.url} newTab>
				<span class="flex items-center gap-1">
					Online
					<ExternalLink class="h-4 w-4" />
				</span>
			</Link>
		{/if}
	</div>
{:else}
	<div class="mt-4 flex gap-x-4">
		<div
			class="border-foreground/20 flex items-center justify-center rounded-md border-[0.5px] px-4 py-1"
		>
			{#if event?.physicalLocation}
				<MapPin class="text-muted-foreground my-3" size={24} />
			{:else if event?.jam}
				<PhoneCall class="text-muted-foreground my-3" size={24} />
			{:else if event?.url}
				<LinkIcon class="text-muted-foreground my-3" size={24} />
			{/if}
		</div>
		<div>
			{#if event?.physicalLocation}
				<div>
					<p class="">
						{truncate
							? truncateText(event.physicalLocation.text)
							: event.physicalLocation.text || 'Physical Location'}
					</p>
				</div>
			{:else if event?.jam}
				<div>
					<p class="">Jam Event</p>
					<a href={jamLink} target="_blank" rel="noopener noreferrer" class="anchor mt-2"
						>{truncateText(jamLink, 30)}</a
					>
				</div>
			{:else if event?.url}
				<div>
					<p class="">External Event</p>
					<a href={event.url} target="_blank" rel="noopener noreferrer" class="anchor mt-2"
						>{truncateText(event?.url, 40)}</a
					>
				</div>
			{/if}
		</div>
	</div>
{/if}
