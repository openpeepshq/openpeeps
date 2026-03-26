<script lang="ts">
	import { getLivekitRoom, jamRoles } from '$lib/components/core/jams/context';
	import { closeJamMutation } from '$lib/api';
	import Close from '../modals/close.svelte';
	import { getModalManager, Button } from '@openpeeps/ui';
	import { i18nContext } from '$lib/components/i18n';

	const modalManager = getModalManager();
	const { t } = i18nContext();
	const { iAmModerator } = jamRoles();
	const room = getLivekitRoom();
	const closeJam = closeJamMutation({ id: room.name });

  const handleLeaveJam = async () => {
    await room.disconnect();
    modalManager.close();
  };

  const closeJamAndExit = async () => {
    await closeJam();
    modalManager.close();
  };

  const handleModeratorLeaveJam = () =>
    modalManager.show(Close, {
      handleConfirm: handleLeaveJam,
      title: t('jams.exit.title'),
      body: t('jams.exit.closeOrExit.description'),
      confirmText: t('jams.exit.confirm'),
      cancelText: t('jams.close.confirm'),
      isError: true,
      onCancel: closeJamAndExit,
    });
</script>

{#if iAmModerator}
	<Button
		variant="variant-filled-error"
		title={t('jams.exit.confirm')}
		action={handleModeratorLeaveJam}
	>
		{t('jams.exit.confirm')}
	</Button>
{:else}
	<Button variant="variant-filled-error" title={t('jams.exit.confirm')} action={handleLeaveJam}
		>{t('jams.exit.confirm')}</Button
	>
{/if}
