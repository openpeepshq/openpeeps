<script lang="ts">
	import { Avatar } from '../profile';
	import type { PublicProfile } from '@openpeeps/common/types';
	import { profileName, truncateText } from '@openpeeps/common/lib';
  import ConversationProfilesAvatar from './ConversationProfilesAvatar.svelte';

	interface Props {
		participants: PublicProfile[];
		max?: number | undefined;
		truncate?: boolean;
		size?: number;
		justImage?: boolean;
		navigate?: boolean;
	}

	let { participants, max = undefined, truncate, size = 2.5, justImage = false, navigate = false }: Props = $props();
	const names = participants.map(profileName).join(', ');
</script>

<div class="flex w-full justify-between gap-4 p-5">
	<ConversationProfilesAvatar  profiles={participants}/>
	{#if !justImage}
		<div class="md:hidden">
			{truncate ? truncateText(names, 20) : names}
		</div>
		<div class="hidden md:block">
			{truncate ? truncateText(names, 100) : names}
		</div>
	{/if}
</div>
