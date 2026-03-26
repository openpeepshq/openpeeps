<script lang="ts">
  import {
    OpenpeepsMarkdown,
    AuthLayout,
    getServerDataContext,
  } from '@openpeeps/svelte/components';
  import { Link } from '@openpeeps/ui';

  let { serverInfo } = getServerDataContext();
</script>

<AuthLayout>
  <h1 class="h1 pb-4 font-bold">
    Welcome to {serverInfo?.communityConfig.info.name}
  </h1>

  <OpenpeepsMarkdown
    source={serverInfo?.communityConfig.content?.aboutPage ||
      'This is a community hosted on AllPeep.'}
  />
  <div class="flex justify-between px-2">
    {#if serverInfo.communityConfig.settings.openRegistrations}
      <span>
        Don't have an account?
        <Link action="/auth/register" class="text-sm">Sign Up</Link>
      </span>
    {/if}
    <span>
      {#if serverInfo.publicContent}
        <Link action="/feeds/local" class="text-sm">See community feed</Link>
      {/if}
    </span>
  </div>
</AuthLayout>
