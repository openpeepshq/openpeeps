<script lang="ts">
	import type { GroupWithMeta } from '@openpeeps/common/types';
	import { X, Check, Search, ChevronDown, Users } from 'lucide-svelte';
	import { Input, Button } from '@openpeeps/ui';
	import GroupAvatar from './GroupAvatar.svelte';
	import { groupName, matchesGroupQuery } from '@openpeeps/common/lib';
	import { i18nContext } from '$lib/components/i18n';

	const { t } = i18nContext();

	interface Props {
		groups: GroupWithMeta[];
		selectedGroups?: GroupWithMeta[];
		placeholder?: string;
		onchange?: (groups: GroupWithMeta[]) => void;
		groupsToExclude?: GroupWithMeta[];
		container?: string;
		overRide?: boolean;
	}

	let {
		groups,
		selectedGroups = $bindable([]),
		placeholder = '',
		onchange,
		groupsToExclude = [],
		container = '',
		overRide = false
	}: Props = $props();

	let searchString = $state('');
	let selectableGroups = $derived(
		groups
			.filter((g) => !groupsToExclude.map((x) => x.id).includes(g.id))
			.filter((g) => !searchString || matchesGroupQuery(g, searchString))
			.sort((a, b) => groupName(a).localeCompare(groupName(b)))
	);
	let isOpen = $state(false);
	let dropdownContainer: HTMLElement | undefined = $state(undefined);
	let searchInput: HTMLInputElement | undefined = $state(undefined);
	const dimension = $derived((dropdownContainer as unknown as HTMLElement)?.getBoundingClientRect());

	function toggleDropdown() {
		isOpen = !isOpen;
		if (isOpen) {
			setTimeout(() => {
				searchInput?.focus();
			}, 100);
		}
	}

	function closeDropdown() {
		isOpen = false;
		searchString = '';
	}

	function handleClickOutside(event: MouseEvent) {
		if (dropdownContainer && !dropdownContainer.contains(event.target as Node)) {
			closeDropdown();
		}
	}

	function removeGroup(groupId: string) {
		selectedGroups = selectedGroups.filter((g) => g.id !== groupId);
		onchange?.(selectedGroups);
	}

	function addGroup(group: GroupWithMeta) {
		const exists = selectedGroups.find((g) => g.id === group.id);
		if (!exists) {
			selectedGroups = [...selectedGroups, group];
			onchange?.(selectedGroups);
		}
		searchString = '';
		searchInput?.focus();
	}

	function isGroupSelected(groupId: string): boolean {
		return selectedGroups.some((g) => g.id === groupId);
	}
</script>

<svelte:window onclick={handleClickOutside} />

<div class="relative w-full mb-5 {container}" bind:this={dropdownContainer}>
	<Button
		class="flex w-full min-h-[2.5rem] items-center justify-between rounded-lg border border-surface-300 bg-surface-200 px-3 py-1 text-left"
		action={toggleDropdown}
	>
		<div class="flex flex-1 flex-wrap items-center gap-1">
			{#if selectedGroups.length === 0}
				<span class="text-gray-500 flex items-center gap-2">
					<Users class="size-4" />
					{placeholder}
				</span>
			{:else}
				{#each selectedGroups as group (group.id)}
					<div
						class="flex items-center gap-1.5 bg-surface-50 text-primary px-2 py-1 rounded-md text-sm border border-secondary"
					>
						<GroupAvatar {group} size={0.75} borderless />
						<span class="font-medium">{groupName(group)}</span>
						<Button
							class="ml-1 hover:bg-secondary rounded-full p-0.5 transition-colors"
							action={() => {
								removeGroup(group.id);
							}}
							title={t('common.remove')}
						>
							<X class="size-3" />
						</Button>
					</div>
				{/each}
			{/if}
		</div>
		<ChevronDown
			class="size-4 text-surface-600 transition-transform duration-200 {isOpen ? 'rotate-180' : ''}"
		/>
	</Button>

	{#if isOpen}
		<div
			class="z-[1000] mt-1 w-full rounded-lg border border-surface-300 bg-surface-200 shadow-lg"
			class:fixed={overRide}
			class:absolute={!overRide}
			style={overRide
				? `top: ${dimension.bottom + window.scrollY}px; left: ${dimension.left + window.scrollX}px; width: ${dimension.width}px;`
				: ''}
		>
			<div class="p-3 border-b border-surface-300">
				<div class="relative">
					<Search class="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-primary" />
					<Input
						bind:value={searchString}
						type="text"
						class="w-full rounded-md border border-surface-300 bg-surface-50 pl-10 pr-3 py-2 text-sm"
						placeholder={t('group.search.groupsPlaceholder')}
					/>
				</div>
			</div>

			<div class="max-h-64 overflow-y-auto">
				{#if groups.length === 0}
					<div class="p-4 text-center text-surface-500 text-sm">
						{t('admin.inviteLink.noGroupsToAdd')}
					</div>
				{:else if selectableGroups.length === 0}
					<div class="p-4 text-center text-surface-500 text-sm">
						{searchString ? t('group.search.noResults') : t('group.search.noGroupsAvailable')}
					</div>
				{:else}
					{#each selectableGroups as group (group.id)}
						<Button
							class="w-full p-3 text-left hover:bg-surface-100 transition-colors border-b-[0.5px] border-surface-300 last:border-b-0 flex items-center justify-between {isGroupSelected(group.id) ? 'bg-secondary text-primary' : ''}"
							action={() => addGroup(group)}
						>
							<div class="flex items-center gap-3 min-w-0 flex-1">
								<GroupAvatar {group} size={1.25} borderless />
								<div class="flex flex-col min-w-0">
									<span class="font-medium text-sm truncate">{groupName(group)}</span>
									{#if group.handle}
										<span class="text-xs text-gray-500 truncate">@{group.handle}</span>
									{/if}
								</div>
							</div>
							{#if isGroupSelected(group.id)}
								<Check class="size-4 text-primary shrink-0" />
							{/if}
						</Button>
					{/each}
				{/if}
			</div>
		</div>
	{/if}
</div>
