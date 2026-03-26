<script lang="ts">
  import { Feed, NewNoteButton } from '@openpeeps/svelte/components';
  import { infiniteMyFeedStore } from '@openpeeps/svelte/api';
  import { setPageHeader } from '@openpeeps/svelte/stores';
  import { i18nContext } from '@openpeeps/svelte/components';
  import { getCurrentProfile } from '@openpeeps/svelte/auth';
  import { getDefaultVisibility } from '@openpeeps/svelte';

  const { t } = i18nContext();
  const currentProfile = getCurrentProfile();
  const visibility = getDefaultVisibility();

  const query = infiniteMyFeedStore({ limit: 15 });

  setPageHeader({ title: t('navigation.myFeed') });
</script>

<NewNoteButton {visibility} {currentProfile} />
<Feed {query} />
