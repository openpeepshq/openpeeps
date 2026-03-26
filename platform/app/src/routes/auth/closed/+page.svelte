<script lang="ts">
  import { Button } from '@openpeeps/ui';
  import { goto } from '$app/navigation';

  const navigateToLogin = () => goto('/auth/login');
</script>

<div
  class=" md:w-96 p-4 text-token h-fit space-y-4 variant-glass flex flex-col items-center justify-center"
>
  <h2 class="text-lg font-bold">Sign Ups are Currently Closed</h2>
  <p class="text-center">
    We are not accepting new registrations at this time. Please check back later
    or contact support if you believe this is an error.
  </p>

  <Button
    title="Go to Login"
    action={navigateToLogin}
    variant="variant-filled-primary"
    class="w-full mt-4"
  >
    Go to Login
  </Button>
</div>
