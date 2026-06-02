<script lang="ts">
  import { onMount } from 'svelte';
  import { Link } from '@openpeeps/ui';

  let providerName = $state('');
  let pendingEmail = $state('');

  onMount(() => {
    const url = new URL(window.location.href);
    const providerId = url.searchParams.get('provider') || '';

    try {
      const state = url.searchParams.get('state');
      if (state) {
        const parsed = JSON.parse(Buffer.from(state, 'base64').toString());
        pendingEmail = parsed.pendingEmail || 'your email';
        providerName = parsed.providerName || providerId || 'Administrator';
      } else {
        pendingEmail = 'your email';
        providerName = providerId || 'Administrator';
      }
    } catch {
      pendingEmail = 'your email';
      providerName = providerId || 'Administrator';
    }
  });
</script>

<div class="max-w-md mx-auto mt-8 text-center">
  <div class="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto"></div>
  <h1 class="h1 mt-4">Account Pending Review</h1>
  <p class="mt-4 text-gray-600">
    A new account for <strong>{pendingEmail}</strong> requires administrator approval.
  </p>
  <p class="mt-2 text-sm text-gray-500">
    Please contact the {providerName} administrator to have your account reviewed.
  </p>
  <div class="mt-6">
    <Link action="/auth/login" class="text-indigo-600 hover:underline">
      Back to login
    </Link>
  </div>
</div>
