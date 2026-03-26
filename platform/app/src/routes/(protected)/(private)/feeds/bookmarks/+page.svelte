<script lang="ts">
  import { Feed } from '@openpeeps/svelte/components';
  import { infiniteBookmarkedPostsStore } from '@openpeeps/svelte/api';
  import { i18nContext } from '@openpeeps/svelte/components';
  import { setPageHeader } from '@openpeeps/svelte/stores';
  const { t } = i18nContext();

  const query = infiniteBookmarkedPostsStore({ limit: 15 });
  setPageHeader({ title: t('navigation.bookmarks') });
</script>

<Feed {query} />
