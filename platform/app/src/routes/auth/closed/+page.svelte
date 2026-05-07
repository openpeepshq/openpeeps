<script lang="ts">
  import { Button } from '@openpeeps/ui';
  import { goto } from '$app/navigation';
  import { i18nContext } from '@openpeeps/svelte/components/i18n';

  const { t } = i18nContext();
  const navigateToLogin = () => goto('/auth/login');
</script>

<div
  class=" md:w-96 p-4 text-token h-fit space-y-4 variant-glass flex flex-col items-center justify-center"
>
  <h2 class="text-lg font-bold">{t('auth.closed.heading')}</h2>
  <p class="text-center">
    {t('auth.closed.message')}
  </p>

  <Button
    title={t('auth.closed.goToLogin')}
    action={navigateToLogin}
    variant="variant-filled-primary"
    class="w-full mt-4"
  >
    {t('auth.closed.goToLogin')}
  </Button>
</div>
