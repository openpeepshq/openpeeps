<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { getPostStore } from '@openpeeps/svelte/api';
  import { AccessDeniedLoader, Room } from '@openpeeps/svelte/components';
  import { getCurrentProfile, setCredentials } from '@openpeeps/svelte/auth';

  const { eventId } = page.params;
  const me = getCurrentProfile();

  const token = page.url.searchParams.get('token');
  const observer = page.url.searchParams.get('observer') === 'true';

  if (token) {
    setCredentials({ token });
  }

  const jamQuery = getPostStore(eventId);
  const jamPost = $derived($jamQuery.data);

  $effect(() => {
    const message = $jamQuery.error?.message;
    if (
      $jamQuery.isError &&
      (message || message?.startsWith('Missing capabilities'))
    ) {
      const url = !me ? window.location.pathname : '';
      const authUrl = !me ? '/auth/login?redirect=' : '/jams';
      goto(authUrl + url);
    }
  });
</script>

<AccessDeniedLoader queries={[$jamQuery]} fullScreen={true}>
  {#if jamPost}
    <Room {jamPost} {observer} />
  {/if}
</AccessDeniedLoader>
