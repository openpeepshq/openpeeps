<script lang="ts">
  import { currentProfileStore } from '@openpeeps/svelte/api';
  import {
    OpenpeepsMarkdown,
    AuthLayout,
    getServerDataContext,
    AuthContainer,
  } from '@openpeeps/svelte/components';
  import { Link } from '@openpeeps/ui';

  const currentProfileQuery = currentProfileStore();
  let { serverInfo } = getServerDataContext();
</script>

{#if $currentProfileQuery.data}
  <AuthContainer>
    <h1 class="h1 pb-4 font-bold">
      Welcome to {serverInfo?.communityConfig.info.name}
    </h1>

    <OpenpeepsMarkdown
      source={serverInfo?.communityConfig.content?.aboutPage ||
        'This is a community hosted on AllPeep.'}
    />
    <div class="flex justify-between px-2">
      <span>
        <Link action="/feeds/local" class="text-sm">See community feed</Link>
      </span>
    </div>
  </AuthContainer>
{:else}
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
{/if}
