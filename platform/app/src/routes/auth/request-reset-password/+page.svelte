<script lang="ts">
  import { requestResetPassword } from '@openpeeps/svelte/api';
  import { FormOld, LabelOld, Input } from '@openpeeps/ui';
  import { Button } from '@openpeeps/ui';
  import { getToastStore } from '@skeletonlabs/skeleton';
  import { toast } from '@openpeeps/svelte/utils';
  import { getPageHeaderStore } from '@openpeeps/svelte/stores';

  const toastStore = getToastStore();
  const pageHeaderStore = getPageHeaderStore();

  let prompt = $state(
    'Enter your email address and we will send you an a link to reset your password.',
  );
  let email = $state('');

  const error = $state({
    type: '',
    message: '',
  });

  const handleSubmit = () =>
    requestResetPassword({ email })
      .then(() => {
        prompt = `If your email belongs to an account in this community, you'll receive a message with a link where you can change your password.`;
        toastStore.trigger(
          toast({
            message: `Reset password link has been sent to ${email} successfully.`,
            autohide: false,
          }),
        );
      })
      .catch((error) =>
        toastStore.trigger(
          toast({
            message: error.message
              ? error.message
              : 'Failed to send reset password link, wrong email',
            autohide: false,
          }),
        ),
      );

  $effect(() => {
    pageHeaderStore.set({
      title: 'Request Password Reset',
    });
  });
</script>

<FormOld
  {handleSubmit}
  className="text-token h-fit space-y-6"
  error={error.type === 'general' ? error.message : ''}
>
  <h2 class="text-xl">Request Password Reset</h2>
  <div class="pt-4 mb-10">
    <p class="">
      {prompt}
    </p>
  </div>
  <LabelOld title="Email" message={error.type === 'email' ? error.message : ''}>
    <Input
      bind:value={email}
      error={error.type === 'email'}
      required
      type="email"
      placeholder="you@email.org"
    />
  </LabelOld>

  <div class="mt-10"></div>
  <Button
    title="Request Password Reset"
    variant="variant-filled-primary"
    action={handleSubmit}
    class="w-full"
  >
    Proceed
  </Button>
</FormOld>
