<script lang="ts">
	import { Avatar } from '@skeletonlabs/skeleton';
	import type { PublicProfile } from '@openpeeps/common/types';
	import { getServerInfo } from '$lib/server';
	import { getTheme } from '@openpeeps/common';
  import { currentProfileSettingsStore } from '$lib/api';

	interface Props {
		profile?: PublicProfile | undefined;
		size?: number;
		borderless?: boolean;
		containerClass?: string;
		navigate?: boolean;
	}

	let {
		profile = undefined,
		size = 3.5,
		borderless = false,
		containerClass = '',
		navigate = false
	}: Props = $props();


	let profileSettingsQuery = currentProfileSettingsStore()
	let profileSettings = $profileSettingsQuery.data
	const defaultProfileAvatar = getTheme(getServerInfo().communityConfig, profileSettings).defaultProfileAvatar;

	const initialize = (profile: PublicProfile | undefined): string => {
		const name = profile?.displayName || profile?.handle || '?';
		const parts = name.split(' ');
		return [parts.at(0), parts.at(-1)]
			.filter(Boolean)
			.map((part) => part?.substring(0, 1).toUpperCase())
			.join('');
	};
</script>

<div
	style={`width: ${size}rem; height: ${size}rem; min-width: ${size}rem !important;`}
	class={containerClass}
>
	{#if navigate}
		<a href={`/@${profile?.handle}`}>
			<Avatar
				border={borderless ? '' : 'border-4 border-surface-300-600-token hover:!border-neutral-500'}
				src={profile?.avatar ? profile.avatar : defaultProfileAvatar}
				initials={initialize(profile)}
				width="w-full"
				background="transparent"
			/>
		</a>
	{:else}
		<Avatar
			border={borderless ? '' : 'border-4 border-surface-300-600-token hover:!border-neutral-500'}
			src={profile?.avatar ? profile.avatar : defaultProfileAvatar}
			initials={initialize(profile)}
			width="w-full"
			background="transparent"
		/>
	{/if}
</div>
