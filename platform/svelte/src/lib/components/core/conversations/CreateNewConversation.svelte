<script lang="ts">
	import { Button } from '@openpeeps/ui';
	import { X, Search, Check } from 'lucide-svelte';
	import { Input } from '@openpeeps/ui';
	import { getModalStore } from '@skeletonlabs/skeleton';
	import { Avatar } from '../profile';
	import type { PublicProfile } from '@openpeeps/common/types';
	import { profilesStore, me } from '$lib/api';
	import { ProfileCard } from '$lib/components/core/profile';
	import { createConversationMutation } from '$lib/api';
	import { goto } from '$app/navigation';
	import { matchesQuery } from '@openpeeps/common/lib';
	import { ModalFooter, ModalHeader, ModalWrapper } from '@openpeeps/ui';
	import { i18nContext } from '$lib/components/i18n';

	const { t } = i18nContext();

	const modalStore = getModalStore();

	interface Props {
		profiles?: PublicProfile[];
		message?: string;
		skipProfileSelection?: boolean;
	}

	let {
		profiles: selectedProfiles = [],
		message = '',
		skipProfileSelection = false
	}: Props = $props();

	let currentStep = $state(skipProfileSelection ? 2 : 1);
	let profileQuery = $state('');

	const profilesQuery = profilesStore();
	const createConversation = createConversationMutation();

	const start = () =>
		createConversation({
			data: {
				type: 'note',
				content: message
			},
			audience: [$me, ...selectedProfiles],
			visibility: 'direct',
			type: 'note'
		}).then((data) => {
			goto(`/conversations/${data.id}`);
			modalStore.close();
		});

	let selectableProfiles: PublicProfile[] = $derived(
		$profilesQuery.data?.filter(
			(p: PublicProfile) => p.id !== $me?.id && (!profilesQuery || matchesQuery(p, profileQuery))
		) ?? []
	);
	const maxLength = 500;
</script>

<ModalWrapper>
	{#if currentStep === 1}
		<ModalHeader title={t('conversations.createNew.title')} />
		<article class="flex h-[60vh] flex-col overflow-y-scroll px-4 pb-4 pt-2">
			<div class="flex w-full items-center gap-x-2 border-b-2">
				<Search size={24} />
				<Input
					bind:value={profileQuery}
					placeholder={t('conversations.createNew.searchPlaceholder')}
					class="bg-surface-300 w-[95%] border-none outline-none"
				/>
			</div>
			{#if selectedProfiles.length > 0}
				<div class="mt-2 flex flex-wrap gap-2 border-b-2 pb-2">
					{#each selectedProfiles as profile (profile.id)}
						<div class="flex items-center gap-2 rounded-xl border px-3 py-1">
							<Avatar {profile} />
							<h4 class="font-semibold">
								{profile.displayName || profile.handle}
							</h4>
							<Button
								title={t('common.remove')}
								action={() => {
									selectedProfiles = selectedProfiles.filter((p) => p.id !== profile.id);
								}}
							>
								<X />
							</Button>
						</div>
					{/each}
				</div>
			{/if}
			{#if $profilesQuery.isSuccess}
				{#each selectableProfiles as profile (profile.id)}
					<Button
						title={t('common.add')}
						class="mt-2 flex items-center justify-between"
						action={() => {
							const accountExists = selectedProfiles.find((account) => account.id === profile.id);
							if (!accountExists) {
								selectedProfiles = [...selectedProfiles, profile];
							}
						}}
					>
						<ProfileCard {profile}>
							{#snippet action()}
								<Check
									class={selectedProfiles.map((p) => p.id).includes(profile.id) ? '' : 'hidden'}
								/>
							{/snippet}
						</ProfileCard>
					</Button>
				{/each}
			{/if}
		</article>
		<ModalFooter>
			<Button
				title={t('common.next')}
				disabled={!selectedProfiles?.length}
				action={() => {
					currentStep = 2;
				}}
				variant="variant-filled-primary"
			>
				{t('common.next')}
			</Button>
		</ModalFooter>
	{:else if currentStep === 2}
		<ModalHeader title={t('conversations.createNew.sendMessage')} />
		<article class="flex flex-col overflow-y-scroll px-4 pb-4 pt-2">
			<div class="flex w-full items-center justify-center">
				<textarea
					class="bg-surface-300 h-32 w-[98%] rounded-lg border p-2 outline-none"
					placeholder={t('conversations.createNew.messagePlaceholder')}
					bind:value={message}
					maxlength={maxLength}
				></textarea>
			</div>
		</article>
		<ModalFooter>
			<div class="flex items-center gap-x-2">
				<Button
					title={t('common.back')}
					disabled={message.length === 0}
					action={() => {
						currentStep = 1;
					}}
					variant="variant-ringed-surface"
				>
					{t('common.back')}
				</Button>
			</div>
			<div class="flex items-center gap-x-2">
				<span class="text-lg">
					{message.length > 0 ? 500 - message.length : 500}
				</span>
				<span class="text-lg">EN</span>
				<Button
					title={t('conversations.createNew.send')}
					disabled={!selectedProfiles?.length}
					action={start}
					variant="variant-filled-primary"
				>
					{t('conversations.createNew.send')}
				</Button>
			</div>
		</ModalFooter>
	{/if}
</ModalWrapper>
