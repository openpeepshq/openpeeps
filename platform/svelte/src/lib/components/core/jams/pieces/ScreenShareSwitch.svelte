<script lang="ts">
	import { getLivekitRoom } from '$lib/components/core/jams/context';
	import { screenShareStateStore } from '$lib/components/core/jams/stores';
	import { ScreenShare, ScreenShareOff } from 'lucide-svelte'; // Import appropriate icons
	import { toggleScreenShare } from '$lib/components/core/jams/actions';
	import { Button, stopPropagation } from '@openpeeps/ui';
	import MobileMenuButton from './MobileMenuButton.svelte';
	import { i18nContext } from '$lib/components/i18n';

	const { t } = i18nContext();
	const room = getLivekitRoom();

	const screenShareState = screenShareStateStore(room.localParticipant);

	interface Props {
		closeMenu?: () => void;
	}

	const { closeMenu }: Props = $props();
</script>

<!-- desktop -->
<Button
	title={t('jams.screenShare.startStopTitle')}
	variant={$screenShareState ? 'variant-soft-primary' : 'variant-soft-surface'}
	class="hidden size-10 p-2 md:flex"
	action={() => toggleScreenShare(room)}
>
	{#if !$screenShareState}
		<ScreenShare />
	{:else}
		<ScreenShareOff />
	{/if}
</Button>
<!-- mobile -->

<MobileMenuButton
	icon={$screenShareState ? ScreenShareOff : ScreenShare}
	label={$screenShareState ? t('jams.screenShare.stopScreenshareMobile') : t('jams.screenShare.startScreenshareMobile')}
	action={() => {
		closeMenu?.();
		toggleScreenShare(room);
	}}
/>
