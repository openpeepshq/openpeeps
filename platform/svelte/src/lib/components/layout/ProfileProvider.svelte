<script lang="ts">
  import {
    currentAccountStore,
    currentProfileSettingsStore,
    currentProfileStore,
  } from '$lib/api';
  import { setCurrentIdentityContext } from '$lib/auth';
  import type { IdentityContext } from '$lib/types';
  import { mergeQueryResults } from '$lib/utils/queryHelpers';
  import { Loader } from '@openpeeps/ui';
  interface Props {
    children?: import('svelte').Snippet;
  }

  let { children }: Props = $props();

  const currentAccountQuery = currentAccountStore();
  const currentProfileQuery = currentProfileStore();
  const currentProfileSettingsQuery = currentProfileSettingsStore();

  let identityQueryResult = $derived(
    mergeQueryResults<IdentityContext>({
      profile: $currentProfileQuery,
      account: $currentAccountQuery,
      profileSettings: $currentProfileSettingsQuery,
    }),
  );
  setCurrentIdentityContext({
    get profile() {
      return identityQueryResult.data.profile;
    },
    get profileSettings() {
      return identityQueryResult.data.profileSettings;
    },
    get account() {
      return identityQueryResult.data.account;
    },
  });
</script>

<Loader
  queries={[
    $currentAccountQuery,
    $currentProfileQuery,
    identityQueryResult.data.profile ? $currentProfileSettingsQuery : null,
  ].filter((i) => i !== null)}
  ignoreErrors
>
  {@render children?.()}
</Loader>
