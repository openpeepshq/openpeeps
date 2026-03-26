<script lang="ts">
	import type { PublicProfile } from '@openpeeps/common/types';
	import FollowUnfollowButton from './FollowUnfollowButton.svelte';
	import { Avatar } from '.';
	import { profileName } from '@openpeeps/common/lib';

	interface Props {
		profile: PublicProfile;
		avatarSize?: number;
		showAction?: boolean;
		noPadding?: boolean;
		badges?: import('svelte').Snippet;
		action?: import('svelte').Snippet;
	}

	let {
		profile,
		avatarSize = 3.5,
		showAction = true,
		noPadding = false,
		badges,
		action
	}: Props = $props();
</script>

<div class="flex justify-between {noPadding ? '' : 'p-4'} w-full">
	<a href={`/@${profile.handle}`} class="flex items-center gap-x-2">
		<Avatar {profile} borderless size={avatarSize} />
		<div class="text-left">
			<h3 class="flex gap-2 text-lg font-semibold {avatarSize < 2 ? 'text-sm' : 'text-lg'}">
				<span>{profileName(profile)}</span>
				{@render badges?.()}
			</h3>
			<h3 class={avatarSize < 2 ? 'text-xs' : 'text-sm'}>@{profile.handle}</h3>
		</div>
	</a>
	{#if showAction}
		{#if action}{@render action()}{:else}
			<FollowUnfollowButton {profile} />
		{/if}
	{/if}
</div>
