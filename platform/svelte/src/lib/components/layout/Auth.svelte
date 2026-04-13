<script lang="ts">
  import { goto } from '$app/navigation';
  import { getCredentials } from '$lib/auth';
  import { onMount } from 'svelte';
  import { getServerInfo } from '$lib/server';
  import { currentProfileStore, checkPaymentStatus } from '$lib/api';
  import { page } from '$app/state';
  import { isStripeActive } from '@openpeeps/common';
  import { AuthContainer } from '.';
  interface Props {
    description?: import('svelte').Snippet;
    children?: import('svelte').Snippet;
  }

  let { description, children }: Props = $props();

  const currentProfileQuery = currentProfileStore();
  const paymentStatus = checkPaymentStatus();

  const serverInfo = getServerInfo();

  const { payments } = serverInfo;
  const stripeEnabled = payments?.stripe.paidMembership.enabled;

  const hasPayment = page.url.searchParams.has('payment');

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

<AuthContainer {description} {children} />
