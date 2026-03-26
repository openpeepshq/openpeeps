<script lang="ts">
  import { Feed, NewNoteButton } from '@openpeeps/svelte/components';
  import { infiniteHashtagFeedStore } from '@openpeeps/svelte/api';
  import { page } from '$app/state';
  import { setPageHeader } from '@openpeeps/svelte/stores';
  import { getDefaultVisibility } from '@openpeeps/svelte/utils';
  import { getCurrentProfile } from '@openpeeps/svelte/auth';

  const visibility = getDefaultVisibility();
  const currentProfile = getCurrentProfile();

  let query = infiniteHashtagFeedStore(page.params.hashtag, { limit: 15 });
  let title = `#${page.params.hashtag}`;
  setPageHeader({ title });
</script>

<NewNoteButton {visibility} {currentProfile} />
<Feed {query} />
