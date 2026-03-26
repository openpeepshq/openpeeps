<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { checkPaymentSuccess } from '@openpeeps/svelte/api';
  import { AccessDeniedLoader } from '@openpeeps/svelte/components';
  import { LoadingIcon } from '@openpeeps/ui';

  const paymentSuccess = checkPaymentSuccess();
  const paymentData = $derived($paymentSuccess.data);
  const subscriptionVerified = $derived(!!paymentData?.success);
  const verifying = $derived(
    $paymentSuccess.isPending ||
      (!$paymentSuccess.isError && !subscriptionVerified),
  );

  $effect(() => {
    if (!subscriptionVerified) return;
    if (page.url.searchParams.has('user')) {
      goto('/feeds/local');
    } else {
      goto('/welcome');
    }
  });

  const verifyingShellClass =
    'flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 p-4 text-center';
</script>

<AccessDeniedLoader queries={[$paymentSuccess]} fullScreen={true}>
  {#snippet loading()}
    <div class={verifyingShellClass}>
      <LoadingIcon />
      <p class="mt-6 max-w-sm text-lg text-gray-600">Verifying your payment…</p>
    </div>
  {/snippet}

  {#snippet children()}
    {#if verifying}
      <div class={verifyingShellClass}>
        <LoadingIcon />
      </div>
    {:else}
      <div
        class="flex min-h-screen items-center justify-center bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 p-4"
      >
        <div class="w-full max-w-md">
          <div class="mb-8 text-center">
            <div class="relative inline-block">
              <div
                class="absolute inset-0 h-24 w-24 animate-ping rounded-full bg-green-100 opacity-75"
              ></div>
              <div
                class="relative flex h-24 w-24 items-center justify-center rounded-full bg-green-500"
              >
                <svg
                  class="h-12 w-12 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="3"
                    d="M5 13l4 4L19 7"
                  ></path>
                </svg>
              </div>
            </div>
          </div>

          <div class="space-y-4 text-center">
            <h1 class="mb-2 text-3xl font-bold text-gray-900">
              Payment Successful!
            </h1>
            <p class="mb-6 text-lg text-gray-600">
              Your subscription is now active and ready to use.
            </p>
          </div>
        </div>
      </div>
    {/if}
  {/snippet}
</AccessDeniedLoader>
