<script lang="ts">
  import { requestResetPassword } from '@openpeeps/svelte/api';
  import { FormOld, LabelOld, Input } from '@openpeeps/ui';
  import { Button } from '@openpeeps/ui';
  import { getToastStore } from '@skeletonlabs/skeleton';
  import { toast } from '@openpeeps/svelte/utils';
  import { getPageHeaderStore } from '@openpeeps/svelte/stores';
  import { i18nContext } from '@openpeeps/svelte/components/i18n';

  const { t } = i18nContext();
  const toastStore = getToastStore();
  const pageHeaderStore = getPageHeaderStore();

  let prompt = $state(t('auth.requestResetPassword.prompt'));
  let email = $state('');

  const error = $state({
    type: '',
    message: '',
  });

  const handleSubmit = () =>
    requestResetPassword({ email })
      .then(() => {
        prompt = t('auth.requestResetPassword.successPrompt');
        toastStore.trigger(
          toast({
            message: t('auth.requestResetPassword.successToast', { email }),
            autohide: false,
          }),
        );
      })
      .catch((error) =>
        toastStore.trigger(
          toast({
            message: error.message
              ? error.message
              : t('auth.requestResetPassword.errorFallback'),
            autohide: false,
          }),
        ),
      );

  $effect(() => {
    pageHeaderStore.set({
      title: t('auth.requestResetPassword.title'),
    });
  });
</script>

<FormOld
  {handleSubmit}
  className="text-token h-fit space-y-6"
  error={error.type === 'general' ? error.message : ''}
>
  <h2 class="text-xl">{t('auth.requestResetPassword.heading')}</h2>
  <div class="pt-4 mb-10">
    <p class="">
      {prompt}
    </p>
  </div>
  <LabelOld title={t('auth.requestResetPassword.email')} message={error.type === 'email' ? error.message : ''}>
    <Input
      bind:value={email}
      error={error.type === 'email'}
      required
      type="email"
      placeholder={t('auth.requestResetPassword.emailPlaceholder')}
    />
  </LabelOld>

  <div class="mt-10"></div>
  <Button
    title={t('auth.requestResetPassword.title')}
    variant="variant-filled-primary"
    action={handleSubmit}
    class="w-full"
  >
    {t('auth.requestResetPassword.proceed')}
  </Button>
</FormOld>
