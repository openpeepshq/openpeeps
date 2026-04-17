<script lang="ts">
	import JoinButton from './JoinButton.svelte';
	import { X } from 'lucide-svelte';
	import Close from '../modals/close.svelte';
	import GuestDataForm from '$lib/components/core/jams/lobby/GuestDataForm.svelte';
	import DebugPanel from '$lib/components/core/jams/lobby/DebugPanel.svelte';
	import DeviceSelectionForm from '$lib/components/core/jams/lobby/DeviceSelectionForm.svelte';
	import { getModalManager } from '@openpeeps/ui';
	import { goto } from '$app/navigation';
	import { getJamContext } from '$lib/components/core/jams/context';
	import { getCurrentProfile } from '$lib/auth';
	import { i18nContext } from '$lib/components/i18n';

	const { t } = i18nContext();
	const { jamPost } = getJamContext();
	const me = getCurrentProfile();

	const modalManager = getModalManager();
	let showDebugPanel = $state(false);
</script>

{#if me && (me?.type === 'local' || (me?.guestData?.resource?.type === 'jam' && me.guestData.resource.id === jamPost.id))}
	<div class="mx-auto flex h-full w-full max-w-lg items-center justify-center">
		<div class="bg-surface-50 w-full rounded-md border p-4">
			<div class="flex items-center justify-between border border-b-[0.2px] p-2">
				<div class="flex items-center gap-x-2">
					<h2 class="text-lg">{t('jams.lobby.readyTitle')}</h2>
				</div>
				<button
					title={t('jams.exit.title')}
					class="bg-surface-200 flex h-8 w-8 items-center justify-center rounded-full"
					onclick={() =>
						modalManager.show(Close, {
							title: t('jams.exit.title'),
							body: t('jams.lobby.exitLobbyBody'),
							handleConfirm: () => {
								goto('/jams');
								modalManager.close();
							},
							confirmText: t('jams.lobby.exitLobbyConfirm')
						})}
				>
					<X size={16} />
				</button>
			</div>
			<DeviceSelectionForm bind:showDebugPanel />
			{#if showDebugPanel}
				<DebugPanel />
			{/if}
			<div class="h-auto lg:h-full">
				<JoinButton profile={me} />
			</div>
		</div>
	</div>
{:else}
	<GuestDataForm />
{/if}
