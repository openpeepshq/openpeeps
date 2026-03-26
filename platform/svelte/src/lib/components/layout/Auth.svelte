<script lang="ts">
  import { goto } from '$app/navigation';
  import { getCredentials } from '$lib/auth';
  import { onMount } from 'svelte';
  import { getServerInfo } from '$lib/server';
  import {
    currentProfileStore,
    checkPaymentStatus,
    currentProfileSettingsStore,
  } from '$lib/api';
  import { i18nContext } from '$lib/components/i18n';
  import { page } from '$app/state';
  import { getTheme, isStripeActive } from '@openpeeps/common';
  interface Props {
    description?: import('svelte').Snippet;
    children?: import('svelte').Snippet;
  }

  let { description, children }: Props = $props();

  const currentProfileQuery = currentProfileStore();
  const paymentStatus = checkPaymentStatus();

  let profileSettingsQuery = currentProfileSettingsStore();
  let profileSettings = $profileSettingsQuery.data;
  const serverInfo = getServerInfo();
  const logoSmall = getTheme(
    serverInfo.communityConfig,
    profileSettings,
  ).logoSmall;
  const backgroundAuth = getTheme(
    serverInfo.communityConfig,
    profileSettings,
  ).backgroundAuth;

  const {
    communityConfig: {
      info: { tagLine },
    },
    payments,
  } = serverInfo;
  const stripeEnabled = payments?.stripe.paidMembership.enabled;

  const hasPayment = page.url.searchParams.has('payment');

  const { t } = i18nContext();

  const redirectUrl = () => {
    currentProfileQuery.subscribe((result) => {
      const redirect = page.url.searchParams.get('redirect');
      if (result.isSuccess && result.data?.type === 'local') {
        goto(redirect || '/feeds/local');
      }
    });
  };

  onMount(() => {
    if (getCredentials().token) {
      if (stripeEnabled) {
        paymentStatus.subscribe((result) => {
          if (result.isSuccess && isStripeActive(result.data?.subscription)) {
            if (hasPayment) {
              goto('/welcome');
            } else {
              redirectUrl();
            }
          } else {
            return;
          }
        });
      } else {
        redirectUrl();
      }
    }
  });
</script>

<div class="h-screen w-full overflow-hidden md:flex md:h-full">
  <div class="flex-1">
    <img
      src={backgroundAuth}
      alt="Authentication background"
      class="hidden h-full w-full object-cover md:block"
    />
  </div>

  <div
    class="flex-start bg-surface-50 flex h-full w-full flex-1 justify-center overflow-y-auto md:h-auto"
  >
    <div class="mx-auto h-fit space-y-4 p-4 md:mx-10 md:w-[60%]">
      <img src={logoSmall} alt="logo" class="mb-6 h-6 md:h-10" />
      {#if description}{@render description()}{:else}
        <p class="text-sm md:text-lg">
          {tagLine || t('auth.tagline')}
        </p>
      {/if}
      <div>
        {@render children?.()}
      </div>
    </div>
  </div>
</div>
