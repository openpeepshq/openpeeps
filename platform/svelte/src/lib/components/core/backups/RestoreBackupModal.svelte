<script lang="ts">
  import { getModalStore, getToastStore } from '@skeletonlabs/skeleton';
  import { toast } from '$lib/utils/toast';
  import { Button } from '@openpeeps/ui';
  import { restoreBackupMutation } from '$lib/api';
  import { ModalFooter, ModalHeader, ModalWrapper } from '@openpeeps/ui';
  import { i18nContext } from '@openpeeps/svelte/components/i18n';

  const restoreBackup = restoreBackupMutation();

  let zipFile: FileList | null = $state(null);
  // ------------ STORES --------------
  const toastStore = getToastStore();
  const modalStore = getModalStore();
  const { t } = i18nContext();

  // ------------ MUTATIONS ---------------

  const handleRestoreBackup = async () => {
    if (!zipFile) {
      toastStore.trigger(
        toast({
          message: t('admin.backups.restore.selectFile'),
          background: 'variant-filled-error',
        }),
      );
      return;
    }

    await restoreBackup(zipFile.item(0) as File)
      .then(() => {
        toastStore.trigger(
          toast({
            message: t('admin.backups.restore.success'),
            background: 'variant-filled-success',
          }),
        );
      })
      .catch(() => {
        toastStore.trigger(
          toast({
            message: t('admin.backups.restore.error'),
            background: 'variant-filled-error',
          }),
        );
      })
      .finally(() => {
        modalStore.close();
      });
  };
</script>

{#if $modalStore[0]}
  <ModalWrapper>
    <ModalHeader title={t('admin.backups.restore.title')} />

    <article class="flex flex-col p-4">
      <div class="mt-4 w-full">
        <input
          type="file"
          accept=".zip"
          class="w-full border border-neutral-500 py-4"
          bind:files={zipFile}
        />
      </div>
    </article>
    <ModalFooter>
      <div class="flex gap-x-2">
        <Button
          title={t('admin.backups.restore.cancel')}
          variant="variant-filled-primary"
          action={modalStore.close}>{t('admin.backups.restore.cancel')}</Button
        >
        <Button
          title={t('admin.backups.restore.confirm')}
          variant="variant-filled-primary"
          disabled={!zipFile}
          action={handleRestoreBackup}
        >
          {t('admin.backups.restore.confirm')}
        </Button>
      </div>
    </ModalFooter>
  </ModalWrapper>
{/if}
