<script lang="ts">
  import {
    OpenpeepsMarkdown,
    AuthLayout,
    getServerDataContext,
  } from '@openpeeps/svelte/components';
  import { Link } from '@openpeeps/ui';
  import { getCurrentProfile } from '@openpeeps/svelte/auth';

  let { serverInfo } = getServerDataContext();
  const currentProfile = getCurrentProfile();
</script>

<AuthLayout noRedirect>
  <h1 class="h1 pb-4 font-bold">Code of conduct</h1>

  <OpenpeepsMarkdown
    source={serverInfo?.communityConfig.content?.codeOfConduct ||
      'This community has not published a code of conduct yet.'}
  />
  {#if !currentProfile}
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
  {/if}
</AuthLayout>
