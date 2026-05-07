<script lang="ts">
  import { getToastStore } from '@skeletonlabs/skeleton';
  import { login } from '@openpeeps/svelte/api';
  import { loginRequestSchema, type LoginRequest } from '@openpeeps/common/types';
  import { Form, FormInput, SubmitButton } from '@openpeeps/ui';
  import { onMount } from 'svelte';
  import { getPageHeaderStore } from '@openpeeps/svelte/stores';
  import { Link } from '@openpeeps/ui';
  import { toast } from '@openpeeps/svelte/utils';
  import { Eye, EyeOff } from 'lucide-svelte';
  import { getServerInfo } from '@openpeeps/svelte/server';
  import { i18nContext } from '@openpeeps/svelte/components/i18n';

  const { t } = i18nContext();
  const toastStore = getToastStore();

  let data = $state<LoginRequest>({
    email: '',
    password: '',
  });

  let redirectUrl = '';
  getPageHeaderStore().set({
    title: t('auth.login.title'),
  });

  const handleSubmit = async () => {
    await login(data)
      .then((r) => window.open(r?.checkoutUrl || redirectUrl, '_self'))
      .catch((error: { message: string }) =>
        toastStore.trigger(
          toast({
            message: error.message,
            background: 'variant-filled-error',
          }),
        ),
      );
  };

  onMount(async () => {
    const url = new URL(window.location.href);
    const redirect = url.searchParams.get('redirect');
    if (redirect) {
      redirectUrl = redirect;
    } else {
      redirectUrl = '/feeds/local';
    }
  });

  const serverInfo = getServerInfo();
  let showPassword = $state(false);
</script>

<Form {data} schema={loginRequestSchema}>
  <h2 class="text-xl">{t('auth.login.heading')}</h2>

  <p>{t('auth.login.welcomeBack')}</p>

  <FormInput path={['email']} placeholder={t('auth.login.emailPlaceholder')} description={t('auth.login.email')} />

  <FormInput
    path={['password']}
    description={t('auth.login.password')}
    type={showPassword ? 'text' : 'password'}
  >
    {#snippet tail()}
      <button
        onclick={() => (showPassword = !showPassword)}
        aria-label={showPassword ? t('auth.login.hidePassword') : t('auth.login.showPassword')}
        class="m-0 !p-0"
      >
        {#if showPassword}
          <EyeOff size={20} />
        {:else}
          <Eye size={20} />
        {/if}
      </button>
    {/snippet}
  </FormInput>
  <span class="px-2">
    <Link action="/auth/request-reset-password" class="text-sm">
      {t('auth.login.forgotPassword')}
    </Link>
  </span>
  <SubmitButton action={handleSubmit} title={t('auth.login.logIn')} disable={false}
    >{t('auth.login.logIn')}</SubmitButton
  >
</Form>
<div class="flex justify-between px-2">
  {#if serverInfo.communityConfig.settings.openRegistrations}
    <span>
      <Link action="/about" class="text-sm">{t('auth.login.joinCommunity')}</Link>
    </span>
  {/if}
  <span>
    {#if serverInfo.publicContent}
      <Link action="/feeds/local" class="text-sm">{t('auth.login.seeCommunityFeed')}</Link>
    {/if}
  </span>
</div>
