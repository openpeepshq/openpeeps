<script lang="ts">
  import { goto } from '$app/navigation';
  import { getServerInfo } from '@openpeeps/svelte/server';
  import { toaster } from '@openpeeps/svelte';
  import { onMount } from 'svelte';
  import { i18nContext } from '@openpeeps/svelte/components/i18n';
  import { page } from '$app/state';
  import { getCurrentProfile } from '@openpeeps/svelte/auth';

  console.log('page', page);

  const { publicContent } = getServerInfo();
  const { t } = i18nContext();

  let toastType = $derived(page.url.searchParams.get('toast'));

  const toast = toaster();

  let currentProfile = getCurrentProfile();

  onMount(() => {
    if (toastType === 'success') {
      toast({
        message: t('auth.email.validation.success'),
        type: 'success',
      });
    }
  });

  if (currentProfile || publicContent) {
    console.log('redirecting to /feeds/local');
    goto('/feeds/local');
  } else {
    console.log('redirecting to /auth/login');
    goto('/auth/login');
  }
</script>
