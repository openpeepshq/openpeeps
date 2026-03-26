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
    title: 'Sign Up',
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
      message: 'Passwords do not match',
      path: ['confirmPassword'],
    })
    .refine((data) => data.privacyPolicyAccepted, {
      message: 'You must agree to the privacy policy',
      path: ['privacyPolicyAccepted'],
    });

  onMount(() => {
    const urlParams = new URLSearchParams(window.location.search);
    data.inviteCode = urlParams.get('inviteCode') || '';
  });
</script>

<Form {data} schema={registerFormSchema}>
  <h2 class="text-xl">Create account</h2>

  {#if invite}
    <p class="my-2">
      You{'’'}ve been invited to join {serverInfo.communityConfig.info.name},
      enter details below to be a part of the community.
    </p>
  {/if}

  <FormInput
    description="Handle"
    type="text"
    placeholder="Handle"
    path={['handle']}
  />

  <FormInput
    description="Name"
    type="text"
    placeholder="Name"
    path={['displayName']}
  />

  <FormInput
    description="Email"
    type="email"
    placeholder="you@email.org"
    path={['email']}
  />

  <FormInput
    path={['password']}
    description="Password"
    type={showPassword ? 'text' : 'password'}
  >
    {#snippet tail()}
      <button
        type="button"
        class="m-0 !p-0"
        onclick={() => (showPassword = !showPassword)}
        aria-label={showPassword ? 'Hide password' : 'Show password'}
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
    description="Confirm Password"
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
      I have read and agree to the<a
        href={privacyPolicyLink}
        target="_blank"
        class="anchor w-full px-4 text-sm"
      >
        Privacy Policy
      </a>
    </p>
  </span>

  <SubmitButton action={handleSubmit} title="Sign Up">Sign Up</SubmitButton>
</Form>
{#if serverInfo.publicContent}
  <div class="flex justify-between pt-1">
    <span>
      Already have an account?
      <Link action="/auth/login" class="text-sm">Sign In</Link>
    </span>
    <Link action="/feeds/local" class="text-sm">See community feed</Link>
  </div>
{:else}
  <div class="flex justify-center pt-1">
    <span>
      Already have an account?
      <Link action="/auth/login" class="text-sm">Sign In</Link>
    </span>
  </div>
{/if}
