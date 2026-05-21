<script lang="ts">
  import { goto } from '$app/navigation';
  import { getServerInfo } from '@openpeeps/svelte/server';
  import { toaster } from '@openpeeps/svelte';
  import { onMount } from 'svelte';
  import { i18nContext } from '@openpeeps/svelte/components/i18n';
  import { page } from '$app/state';
  import { getCurrentProfile } from '@openpeeps/svelte/auth';

  const { publicContent } = getServerInfo();
  const { t } = i18nContext();

  const toast = toaster();

  onMount(() => {
    if (page.url.searchParams.get('toast') === 'success') {
      toast({
        message: t('auth.email.validation.success'),
        type: 'success',
      });
    }
    const profile = getCurrentProfile();
    if (profile || publicContent) {
      goto('/feeds/local', { replaceState: true });
    } else {
      goto('/auth/login', { replaceState: true });
    }
  });
</script>
