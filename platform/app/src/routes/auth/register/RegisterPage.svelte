<script lang="ts">
  import { onMount } from 'svelte';
  import {
    registerRequestSchema,
    type RegisterRequest,
  } from '@openpeeps/common/types';
  import { goto } from '$app/navigation';
  import { Form, FormInput, SubmitButton } from '@openpeeps/ui';
  import {
    calculatePasswordStrength,
    getStrengthMessage,
    toaster,
  } from '@openpeeps/svelte/utils';
  import { register, createCheckoutMutation } from '@openpeeps/svelte/api';
  import { getServerInfo } from '@openpeeps/svelte/server';
  import { getPageHeaderStore } from '@openpeeps/svelte/stores';
  import { Eye, EyeOff } from 'lucide-svelte';
  import { Link } from '@openpeeps/ui';
  import { i18nContext } from '@openpeeps/svelte/components/i18n';

  const { t } = i18nContext();

  const toast = toaster();

  interface Props {
    invite?: boolean;
  }

  let { invite = false }: Props = $props();

  let showPassword = $state(false);

  const serverInfo = getServerInfo();
  const createCheckout = createCheckoutMutation();

  const data = $state<RegisterRequest>({
    email: '',
    handle: '',
    displayName: '',
    password: '',
    privacyPolicyAccepted: false,
    confirmPassword: '',
  });

  getPageHeaderStore().set({
    title: t('auth.register.title'),
  });

  const privacyPolicyLink =
    serverInfo.communityConfig.info.privacyPolicy || '/docs/privacy';
  const stripeMembershipEnabled = $derived(
    serverInfo.payments?.stripe?.paidMembership.enabled,
  );

  const handleSubmit = async () =>
    register(data)
      .then(async () => {
        if (stripeMembershipEnabled) {
          const res = await createCheckout();
          if (res?.url) {
            window.open(res.url, '_self');
          }
        } else {
          await goto('/welcome');
        }
      })
      .catch((res) => toast({ message: t(res.message), type: 'error' }));

  const registerFormSchema = registerRequestSchema
    .refine((data) => data.password === data.confirmPassword, {
      message: t('auth.register.passwordsDoNotMatch'),
      path: ['confirmPassword'],
    })
    .refine((data) => data.privacyPolicyAccepted, {
      message: t('auth.register.mustAgreePrivacyPolicy'),
      path: ['privacyPolicyAccepted'],
    });

  onMount(() => {
    const urlParams = new URLSearchParams(window.location.search);
    data.inviteCode = urlParams.get('inviteCode') || '';
  });
</script>

<Form {data} schema={registerFormSchema}>
  <h2 class="text-xl">{t('auth.register.createAccount')}</h2>

  {#if invite}
    <p class="my-2">
      {t('auth.register.inviteMessage', { communityName: serverInfo.communityConfig.info.name })}
    </p>
  {/if}

  <FormInput
    description={t('auth.register.handle')}
    type="text"
    placeholder={t('auth.register.handlePlaceholder')}
    path={['handle']}
  />

  <FormInput
    description={t('auth.register.name')}
    type="text"
    placeholder={t('auth.register.namePlaceholder')}
    path={['displayName']}
  />

  <FormInput
    description={t('auth.register.email')}
    type="email"
    placeholder={t('auth.register.emailPlaceholder')}
    path={['email']}
  />

  <FormInput
    path={['password']}
    description={t('auth.register.password')}
    type={showPassword ? 'text' : 'password'}
  >
    {#snippet tail()}
      <button
        type="button"
        class="m-0 !p-0"
        onclick={() => (showPassword = !showPassword)}
        aria-label={showPassword ? t('auth.register.hidePassword') : t('auth.register.showPassword')}
      >
        {#if showPassword}
          <EyeOff size={20} />
        {:else}
          <Eye size={20} />
        {/if}
      </button>
    {/snippet}
  </FormInput>

  <FormInput
    description={t('auth.register.confirmPassword')}
    type="password"
    path={['confirmPassword']}
  />

  {#if data.password.length > 0 && data.confirmPassword?.length === 0}
    <div
      class="bg-surface-300-600-token border-surface-100-800-token flex w-full justify-center rounded py-2"
    >
      <p>{getStrengthMessage(calculatePasswordStrength(data.password))}</p>
    </div>
  {/if}

  <span class="flex w-full items-center justify-start">
    <FormInput
      description=""
      type="checkbox"
      path={['privacyPolicyAccepted']}
    />
    <p class="ml-4">
      {t('auth.register.privacyPolicyAgreement')}<a
        href={privacyPolicyLink}
        target="_blank"
        class="anchor w-full px-4 text-sm"
      >
        {t('auth.register.privacyPolicy')}
      </a>
    </p>
  </span>

  <SubmitButton action={handleSubmit} title={t('auth.register.signUp')}>{t('auth.register.signUp')}</SubmitButton>
</Form>
{#if serverInfo.publicContent}
  <div class="flex justify-between pt-1">
    <span>
      {t('auth.register.alreadyHaveAccount')}
      <Link action="/auth/login" class="text-sm">{t('auth.register.signIn')}</Link>
    </span>
    <Link action="/feeds/local" class="text-sm">{t('auth.register.seeCommunityFeed')}</Link>
  </div>
{:else}
  <div class="flex justify-center pt-1">
    <span>
      {t('auth.register.alreadyHaveAccount')}
      <Link action="/auth/login" class="text-sm">{t('auth.register.signIn')}</Link>
    </span>
  </div>
{/if}
