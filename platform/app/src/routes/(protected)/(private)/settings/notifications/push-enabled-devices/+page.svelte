<script lang="ts">
  import {
    DeletePushSubscriptionModal,
    i18nContext,
  } from '@openpeeps/svelte/components';
  import { getPageHeaderStore } from '@openpeeps/svelte/stores';
  import { pushSubscriptionsStore } from '@openpeeps/svelte/api';
  import { Smartphone, Laptop, Trash2 } from 'lucide-svelte';
  import { getPushSubscription } from '@openpeeps/svelte/push';
  import { getModalManager } from '@openpeeps/ui';

  const { t } = i18nContext();
  const modalManager = getModalManager();
  const pageHeaderStore = getPageHeaderStore();
  const pushSubscriptionsQuery = pushSubscriptionsStore();
  const subscriptions = $derived($pushSubscriptionsQuery.data || []);

  let currentEndpoint = $state<string | null>(null);

  $effect(() => {
    pageHeaderStore.set({
      title: t('settings.notifications.pushEnabledDevices.title'),
    });
  });
  $effect(() => {
    getPushSubscription().then((sub) => {
      if (sub?.endpoint) {
        currentEndpoint = sub.endpoint;
      }
    });
  });

  const isCurrentDevice = (endpoint: string) => {
    return currentEndpoint === endpoint;
  };
</script>

<div class="p-4">
  {#if subscriptions.length === 0}
    <div class="flex w-full items-center justify-center p-4">
      <h2 class="text-lg">
        {t('settings.notifications.pushEnabledDevices.noDevicesFound')}
      </h2>
    </div>
  {:else}
    <div class="bg-foreground overflow-hidden">
      <ul class="divide-y">
        {#each subscriptions as subscription}
          <li
            class="hover:bg-surface-200 flex items-center justify-between p-4 transition-colors"
          >
            <div class="flex items-center gap-4">
              <div class="text-surface-500">
                {#if subscription?.deviceName
                  ?.toLowerCase()
                  .match(/phone|android|mobile|ios/)}
                  <Smartphone size={20} />
                {:else}
                  <Laptop size={20} />
                {/if}
              </div>

              <div>
                <div class="flex items-center gap-2">
                  <p class="text-success-400 text-sm font-medium">
                    {subscription?.deviceName || t('common.unknownDevice')}
                  </p>
                  {#if isCurrentDevice(subscription?.endpoint)}
                    <span
                      class="bg-primary text-primary rounded-full px-2 py-0.5 text-[10px] font-bold uppercase"
                    >
                      {t('common.thisDevice')}
                    </span>
                  {/if}
                </div>
                <p class="text-surface-500 text-xs">
                  {subscription.type}
                </p>
              </div>
            </div>

            <button
              class="text-surface-500 p-2 transition-colors hover:text-red-600"
              title={t('common.actions.delete')}
              onclick={() =>
                modalManager.show(DeletePushSubscriptionModal, {
                  pushSubscription: subscription,
                  isCurrentDevice:
                    isCurrentDevice(subscription?.endpoint) || false,
                })}
            >
              <Trash2 size={18} />
            </button>
          </li>
        {/each}
      </ul>
    </div>
  {/if}
</div>
