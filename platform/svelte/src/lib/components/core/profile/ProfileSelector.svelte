<script lang="ts">
	import type { PublicProfile } from '@openpeeps/common/types';
	import { X, Check, Search, ChevronDown, Users } from 'lucide-svelte';
	import { profilesStore } from '$lib/api';
	import { Input, Button } from '@openpeeps/ui';
	import { Avatar } from './index';
	import { matchesQuery, profileName, sortProfiles } from '@openpeeps/common/lib';
	import { i18nContext } from '$lib/components/i18n';

	const { t } = i18nContext();

	interface Props {
		selectedProfiles?: PublicProfile[];
		placeholder?: string;
		inline?: boolean;
		onchange?: (profiles: PublicProfile[]) => void;
		profilesToExclude?: PublicProfile[];
		className?: string;
		container?: string;
		overRide?: boolean;
	}

	let {
		selectedProfiles = $bindable([]),
		placeholder = '',
		inline = false,
		onchange,
		profilesToExclude = [],
		className = '',
		overRide = false,
		container = ''
	}: Props = $props();

	let searchString = $state('');
	const profilesQuery = profilesStore();
	let selectableProfiles = $derived(
		sortProfiles(
			$profilesQuery.data
				?.filter((p) => !profilesToExclude.map((p) => p.id).includes(p.id))
				?.filter((p: PublicProfile) => !searchString || matchesQuery(p, searchString)) ?? []
		)
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

	function removeProfile(profileId: string) {
		selectedProfiles = selectedProfiles.filter((p) => p.id !== profileId);
		onchange?.(selectedProfiles);
	}

	function addProfile(profile: PublicProfile) {
		const accountExists = selectedProfiles.find((account) => account.id === profile.id);
		if (!accountExists) {
			selectedProfiles = [...selectedProfiles, profile];
			onchange?.(selectedProfiles);
		}
		searchString = '';
		searchInput?.focus();
	}

	function isProfileSelected(profileId: string): boolean {
		return selectedProfiles.some((p) => p.id === profileId);
	}
</script>

<svelte:window onclick={handleClickOutside} />

<div class="relative w-full mb-5 {container}" bind:this={dropdownContainer}>
	<Button
		class="flex w-full min-h-[2.5rem] items-center justify-between rounded-lg border border-surface-300 bg-surface-200 px-3 py-1 text-left"
		action={toggleDropdown}
	>
		<div class="flex flex-1 flex-wrap items-center gap-1">
			{#if selectedProfiles.length === 0}
				<span class="text-gray-500 flex items-center gap-2">
					<Users class="size-4" />
					{placeholder}
				</span>
			{:else}
				{#each selectedProfiles as profile (profile.id)}
					<div class="flex items-center gap-1.5 bg-surface-50 text-primary px-2 py-1 rounded-md text-sm border border-secondary">
						<Avatar {profile} size={0.75} borderless />
						<span class="font-medium">{profileName(profile)}</span>
						<Button
							class="ml-1 hover:bg-secondary rounded-full p-0.5 transition-colors"
							action={() => {
								removeProfile(profile.id);
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
		<div class="z-[1000] mt-1 w-full rounded-lg border border-surface-300 bg-surface-200 shadow-lg"
			class:fixed={overRide}
			class:absolute={!overRide}
			style={overRide ? `top: ${dimension.bottom + window.scrollY}px; left: ${dimension.left + window.scrollX}px; width: ${dimension.width}px;` : ''}
		>
			<div class="p-3 border-b border-surface-300">
				<div class="relative">
					<Search class="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-primary" />
					<Input
						bind:value={searchString}
						type="text"
						class="w-full rounded-md border border-surface-300 bg-surface-50 pl-10 pr-3 py-2 text-sm"
						placeholder={t('profile.search.profilesPlaceholder')}
					/>
				</div>
			</div>

			{#if $profilesQuery.isSuccess}
				<div class="max-h-64 overflow-y-auto">
					{#if selectableProfiles.length === 0}
						<div class="p-4 text-center text-surface-500 text-sm">
							{searchString ? t('profile.search.noResults') : t('profile.search.noProfilesAvailable')}
						</div>
					{:else}
						{#each selectableProfiles as profile (profile.id)}
							<Button
								class="w-full p-3 text-left hover:bg-surface-100 transition-colors border-b-[0.5px] border-surface-300 last:border-b-0 flex items-center justify-between {isProfileSelected(profile.id) ? 'bg-secondary text-primary' : ''}"
								action={() => addProfile(profile)}
							>
								<div class="flex items-center gap-3">
									<Avatar {profile} size={1.25} borderless />
									<div class="flex flex-col">
										<span class="font-medium text-sm">{profileName(profile)}</span>
										{#if profile.handle}
											<span class="text-xs text-gray-500">{profile.handle}</span>
										{/if}
									</div>
								</div>
								{#if isProfileSelected(profile.id)}
									<Check class="size-4 text-primary" />
								{/if}
							</Button>
						{/each}
					{/if}
				</div>
			{/if}
		</div>
	{/if}
</div>
