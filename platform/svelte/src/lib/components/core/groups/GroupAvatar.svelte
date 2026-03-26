<script lang="ts">
	import { Avatar } from '@skeletonlabs/skeleton';
	import type { GroupData } from '@openpeeps/common/types';
	import { getServerInfo } from '$lib/server';
	import { currentProfileSettingsStore } from '$lib/api';
	import { getTheme } from '@openpeeps/common';

	interface Props {
		group?: GroupData | undefined;
		size?: number;
		borderless?: boolean;
		containerClass?: string;
	}

	let profileSettingsQuery = currentProfileSettingsStore()
	let profileSettings = $profileSettingsQuery.data

	let { group = undefined, size = 3.5, borderless = false, containerClass = '' }: Props = $props();

	const defaultGroupAvatar = getTheme(getServerInfo().communityConfig, profileSettings).defaultGroupAvatar;

	const initialize = (grp: GroupData | undefined): string => {
		const name = grp?.displayName || grp?.handle || '?';
		const parts = name.split(' ');
		return [parts.at(0), parts.at(-1)]
			.filter(Boolean)
			.map((part) => part?.substring(0, 1).toUpperCase())
			.join('');
	};
</script>

<span style={`width: ${size}rem; height: ${size}rem; display: block;`} class={containerClass}>
	<Avatar
		border={borderless ? '' : 'border-4 border-surface-300-600-token hover:!border-neutral-500'}
		src={group?.avatar ? group.avatar : defaultGroupAvatar}
		initials={initialize(group)}
		width="w-full"
	/>
</span>
