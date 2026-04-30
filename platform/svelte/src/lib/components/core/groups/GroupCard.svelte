<script lang="ts">
	import type { GroupWithMeta } from '@openpeeps/common/types';
	import { groupName } from '@openpeeps/common/lib';
	import GroupActionButton from './GroupActionButton.svelte';
	import { GroupAvatar } from '.';

	interface Props {
		group: GroupWithMeta;
		avatarSize?: number;
		showAction?: boolean;
		noPadding?: boolean;
		oneLine?: boolean;
		unreadCount?: number | undefined;
		action?: import('svelte').Snippet;
	}

	let {
		group,
		avatarSize = 3.5,
		showAction = true,
		noPadding = false,
		action,
		oneLine = false,
		unreadCount = undefined
	}: Props = $props();	

	let visibleUnreadCount = $derived(unreadCount && unreadCount > 0 ? unreadCount : undefined);
</script>

<div class="flex justify-between {noPadding ? '' : 'p-4'} w-full">
	<span class="flex min-w-0 flex-1 items-center gap-x-2">
		<GroupAvatar {group} borderless size={avatarSize} containerClass="flex-shrink-0" />
		<span
			class="flex min-w-0 flex-1 overflow-hidden text-left {oneLine
				? 'items-center gap-2'
				: 'flex-col items-start'}"
		>
			<span class="w-32 truncate {avatarSize < 2 ? 'text-sm' : 'text-lg'} font-semibold md:w-full">
				{groupName(group)}
			</span>
			<span class="flex items-center gap-x-1">
				<span class="truncate {avatarSize < 2 ? 'text-xs' : 'text-sm'}">
					{group?.membersCount} member{group?.membersCount === 1 ? '' : 's'}
				</span>
				{#if visibleUnreadCount}
					<span class="bg-primary-500 rounded-full px-2 py-0.5 text-xs font-semibold text-white">
						{visibleUnreadCount} unread
					</span>
				{/if}
			</span>
		</span>
	</span>
	{#if showAction}
		<div class="ml-2 flex-shrink-0">
			{#if action}{@render action()}{:else}
				<GroupActionButton {group} />
			{/if}
		</div>
	{/if}
</div>
