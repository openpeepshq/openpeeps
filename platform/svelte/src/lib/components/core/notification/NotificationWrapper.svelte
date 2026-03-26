<script lang="ts">
	import { Avatar } from '$lib/components/core/profile';
	import type { Profile, ProfileStats } from '@openpeeps/common/types';
	import { User, Users, Dot } from 'lucide-svelte';
	import type { Snippet } from 'svelte';

	interface Props {
		profile: Profile & { profileStats: ProfileStats };
		seen?: boolean;
		isGroup?: string;
		showProfile?: boolean;
		children: Snippet;
	}

	let { profile, isGroup, seen = true, showProfile = true, children }: Props = $props();
</script>

<div class="w-full items-start gap-3 overflow-hidden border-b px-4 py-5 hover:bg-surface-300">
	<div class="flex justify-end">
		{#if !seen}
			<Dot class="h-3 w-3" />
		{/if}
	</div>
	{#if showProfile}
		<div class="flex-shrink-0">
			<div class="flex items-center gap-4 px-6">
				{#if isGroup}
					<Users class="h-8 w-8 text-surface-500" />
				{:else}
					<User class="h-8 w-8 text-surface-500" />
				{/if}
				<a href={`/@${profile?.handle}`}>
					<Avatar {profile} size={4} />
				</a>
			</div>
		</div>
	{/if}

	<div class="flex flex-1 flex-col">
		<div class="flex w-full items-start justify-between">
			<div class="flex-1">
				{@render children()}
			</div>
		</div>
	</div>
</div>
