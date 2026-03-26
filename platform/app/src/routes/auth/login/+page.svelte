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

  const toastStore = getToastStore();

  let data = $state<LoginRequest>({
    email: '',
    password: '',
  });

  let redirectUrl = '';
  getPageHeaderStore().set({
    title: 'Login',
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
  <h2 class="text-xl">Login</h2>

  <p>Welcome back, enter details below to log into your community</p>

  <FormInput path={['email']} placeholder="you@email.org" description="Email" />

  <FormInput
    path={['password']}
    description="Password"
    type={showPassword ? 'text' : 'password'}
  >
    {#snippet tail()}
      <button
        onclick={() => (showPassword = !showPassword)}
        aria-label={showPassword ? 'Hide password' : 'Show password'}
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
      Forgot Password?
    </Link>
  </span>
  <SubmitButton action={handleSubmit} title="Log in" disable={false}
    >Log in</SubmitButton
  >
</Form>
<div class="flex justify-between px-2">
  {#if serverInfo.communityConfig.settings.openRegistrations}
    <span>
      <Link action="/about" class="text-sm">Join Community</Link>
    </span>
  {/if}
  <span>
    {#if serverInfo.publicContent}
      <Link action="/feeds/local" class="text-sm">See community feed</Link>
    {/if}
  </span>
</div>
