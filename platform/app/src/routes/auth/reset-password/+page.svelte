<script lang="ts">
  import { resetPassword } from '@openpeeps/svelte/api';
  import { goto } from '$app/navigation';
  import { FormOld, LabelOld, Input } from '@openpeeps/ui';
  import { Button } from '@openpeeps/ui';
  import { onMount } from 'svelte';
  import { getPageHeaderStore } from '@openpeeps/svelte/stores';
  import { i18nContext } from '@openpeeps/svelte/components/i18n';

  const { t } = i18nContext();

  getPageHeaderStore().set({ title: t('auth.resetPassword.title') });

  let password = $state('');
  let confirmPassword = $state('');

  let token: string = '';

  const error = $state({
    type: '',
    message: '',
  });

  const handleSubmit = () =>
    resetPassword({ password }, token)
      .then(() => goto('/auth/login'))
      .catch((e) => (error.message = e.message));

  onMount(() => {
    token = location.hash.substring(7);
  });
</script>

<FormOld
  {handleSubmit}
  className="text-token h-fit space-y-6"
  error={error.type === 'general' ? error.message : ''}
>
  <h2 class="text-xl">{t('auth.resetPassword.heading')}</h2>

  <LabelOld
    title={t('auth.resetPassword.newPassword')}
    message={error.type === 'password' ? error.message : ''}
  >
    <Input
      bind:value={password}
      error={error.type === 'password'}
      required
      type="password"
    />
  </LabelOld>

  <LabelOld
    title={t('auth.resetPassword.confirmPassword')}
    message={error.type === 'password' ? error.message : ''}
  >
    <Input
      bind:value={confirmPassword}
      error={error.type === 'password'}
      required
      type="password"
    />
  </LabelOld>

  <Button
    title={t('auth.resetPassword.heading')}
    disabled={confirmPassword !== password}
    variant="variant-filled-primary"
    action={handleSubmit}
    class="w-full"
  >
    {t('auth.resetPassword.submitButton')}
  </Button>
</FormOld>
