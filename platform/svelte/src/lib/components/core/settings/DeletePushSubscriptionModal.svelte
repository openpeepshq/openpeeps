
<script lang="ts">
  import { getToastStore } from '@skeletonlabs/skeleton';
  import { Button } from '@openpeeps/ui';
  import { deletePushSubscriptionMutation } from '$lib/api';
  import { i18nContext } from '@openpeeps/svelte/components';
  import { toast } from '$lib/utils/toast';
  import {
    getModalManager,
    ModalFooter,
    ModalHeader,
    ModalWrapper,
  } from '@openpeeps/ui';
  import type { PushSubscription } from '@openpeeps/common';
  import {
    pushSubscriptionDeviceName,
    pushSubscriptionIsMobile,
  } from '@openpeeps/common/lib';
  import { Smartphone, Laptop } from 'lucide-svelte';

  interface Props {
    pushSubscription: PushSubscription;
    deleteCallback?: (() => void) | undefined;
    isCurrentDevice: Boolean;
  }

  let {
    pushSubscription,
    deleteCallback = undefined,
    isCurrentDevice = false,
  }: Props = $props();

  const deviceName = $derived(pushSubscriptionDeviceName(pushSubscription));

  const { t } = i18nContext();
  const modalManager = getModalManager();
  const toastStore = getToastStore();

  const deleteSubscription = deletePushSubscriptionMutation({
    pushSubscriptionId: pushSubscription.id,
  });

  const handleDeletePost = async () => {
    await deleteSubscription();
    toastStore.trigger(
      toast({
        message: t('settings.notifications.pushEnabledDevices.delete.success'),
        background: 'variant-filled-success',
      }),
    );

    deleteCallback?.();

    modalManager.close();
  };
</script>

<ModalWrapper extraClassNames="relative">
  <ModalHeader title={t('settings.notifications.pushEnabledDevices.delete.header')} />
  <article class="  m-4 h-full pb-3">
    <div class="flex items-center gap-4">
      <div class="text-surface-500">
        {#if pushSubscriptionIsMobile(pushSubscription)}
          <Smartphone size={20} />
        {:else}
          <Laptop size={20} />
        {/if}
      </div>

      <div>
        <div class="flex items-center gap-2">
          <p class="text-sm font-medium text-surface-900">
            {deviceName}
          </p>
          {#if isCurrentDevice}
            <span
              class="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase text-surface-500"
            >
              {t('common.thisDevice')}
            </span>
          {/if}
        </div>
        <p class="text-xs text-surface-400">
          {pushSubscription.type}
        </p>
      </div>
    </div>
    <p class="my-4">
      {t('settings.notifications.pushEnabledDevices.delete.description')}
    </p>
  </article>
  <ModalFooter>
    <Button
      title={t('settings.notifications.pushEnabledDevices.delete.confirm')}
      action={handleDeletePost}
      variant="variant-filled-error"
      class="w-full"
    >
      {t('settings.notifications.pushEnabledDevices.delete.confirm')}
    </Button>
    <Button
      title={t('settings.notifications.pushEnabledDevices.delete.cancel')}
      action={() => modalManager.close()}
      variant="variant-ringed-surface"
      class="w-full"
    >
      {t('settings.notifications.pushEnabledDevices.delete.cancel')}
    </Button>
  </ModalFooter>
</ModalWrapper>