<script lang="ts">
  import { Feed, NewNoteButton } from '@openpeeps/svelte/components';
  import { infiniteLocalFeedStore, serverInfoStore } from '@openpeeps/svelte/api';
  import { i18nContext } from '@openpeeps/svelte/components';
  import { setPageHeader } from '@openpeeps/svelte/stores';
  import { getCurrentProfile } from '@openpeeps/svelte/auth';
  import { getDefaultVisibility } from '@openpeeps/svelte';

  const { t } = i18nContext();
  const currentProfile = getCurrentProfile();
  const visibility = getDefaultVisibility();
  const query = infiniteLocalFeedStore({ limit: 15 });

  const serverInfo = serverInfoStore();
  let pinnedPostId: string | undefined = $derived(
    $serverInfo.data?.communityConfig?.content?.pinnedPost,
  );
  setPageHeader({ title: t('navigation.community') });
</script>

<NewNoteButton {visibility} {currentProfile} />
<Feed {query} {pinnedPostId} />
