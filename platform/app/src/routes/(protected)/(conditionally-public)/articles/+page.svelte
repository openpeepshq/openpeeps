<script lang="ts">
  import { getPostsByTypeStore } from '@openpeeps/svelte/api';
  import { getCurrentProfile } from '@openpeeps/svelte/auth';
  import { Feed, NewArticleButton } from '@openpeeps/svelte/components';
  import { setPageHeader } from '@openpeeps/svelte/stores';
  import { i18nContext } from '@openpeeps/svelte/components';
  import { getDefaultVisibility } from '@openpeeps/svelte/utils';

  const { t } = i18nContext();

  const currentProfile = getCurrentProfile();
  const visibility = getDefaultVisibility();

  let query = getPostsByTypeStore('article', { limit: 15 });

  setPageHeader({ title: t('navigation.articles') });
</script>

<NewArticleButton {visibility} {currentProfile} />
<Feed {query} />
