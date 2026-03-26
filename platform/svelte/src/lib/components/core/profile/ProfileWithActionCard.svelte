<script lang="ts">
	import type { PublicProfile } from '@openpeeps/common/types';
	import FollowUnfollowButton from './FollowUnfollowButton.svelte';
	import { Avatar } from '.';
	import { profileName } from '@openpeeps/common/lib';
	import { me } from '$lib/api';

	interface Props {
		profile: PublicProfile;
	}

	let { profile }: Props = $props();
</script>

<div class="flex w-full justify-between border-b p-4">
	<div class="flex items-center gap-x-2">
		<a href={`/@${profile.handle}`}>
			<Avatar {profile} />
		</a>
		<div class="">
			<a href={`/@${profile.handle}`} class="[&>h3]:underline-offset-2 [&>h3]:hover:underline">
				<h3 class="text-lg font-semibold">
					{profileName(profile)}
				</h3>
				<h3 class=" text-sm">@{profile.handle}</h3>
			</a>
		</div>
	</div>
	{#if $me}
		<FollowUnfollowButton {profile} />
	{/if}
</div>
