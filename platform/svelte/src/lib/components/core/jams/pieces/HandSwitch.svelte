<script lang="ts">
	import { getLivekitRoom } from '$lib/components/core/jams/context';
	import { Hand } from 'lucide-svelte';
	import { toggleHand } from '$lib/components/core/jams/actions';
	import { participantHandRaisedStore } from '../stores';
	import { Button } from '@openpeeps/ui';
	import MobileMenuButton from './MobileMenuButton.svelte';
	import { i18nContext } from '$lib/components/i18n';

	const { t } = i18nContext();
	const room = getLivekitRoom();

	interface Props {
		closeMenu?: () => void;
	}

	const { closeMenu }: Props = $props();

	const handStore = participantHandRaisedStore(room.localParticipant);
</script>

<Button
	title={t('jams.hand.raiseTitle')}
	class="hidden size-10 p-2 md:flex"
	variant={$handStore ? 'variant-soft-primary' : 'variant-soft-surface'}
	action={() => toggleHand(room)}
>
	<Hand />
</Button>

<MobileMenuButton
	icon={Hand}
	label={t('jams.hand.raiseLabel')}
	action={() => {
		closeMenu?.();
		toggleHand(room);
	}}
/>
