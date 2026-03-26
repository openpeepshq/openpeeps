<script lang="ts">
  import { getPageHeaderStore } from '@openpeeps/svelte/stores';
  import { page } from '$app/state';
  import { Button, Input } from '@openpeeps/ui';
  import SearchResults from './SearchResults.svelte';
  import { i18nContext } from '@openpeeps/svelte/components';
  import { Search } from 'lucide-svelte';

  getPageHeaderStore().set({ title: 'Explore' });

  const { t } = i18nContext();

  let tabSet: number = $state(0);

  let search: string = $state(page.url.searchParams.get('q') || '');

  let searchInput: string = $state(search);

  $effect(() => {
    if (page.url.hash.includes('members')) {
      tabSet = 0;
    } else if (page.url.hash.includes('posts')) {
      tabSet = 1;
    } else if (page.url.hash.includes('jams')) {
      tabSet = 2;
    } else if (page.url.hash.includes('events')) {
      tabSet = 3;
    } else if (page.url.hash.includes('groups')) {
      tabSet = 5;
    }
  });

  const triggerSearch = () => {
    search = searchInput;
    history.replaceState(
      null,
      '',
      page.url.pathname + '?q=' + search + page.url.hash,
    );
  };
</script>

<div class="p-4">
  <div class="flex gap-x-2">
    <Input
      placeholder={t('explore.enterSearchQuery')}
      bind:value={searchInput}
      class="flex-grow"
      onkeydown={(e) => {
        if (e.key === 'Enter') {
          triggerSearch();
        }
      }}
    />
    <Button
      variant="variant-filled-primary"
      title={t('explore.SearchButton')}
      action={triggerSearch}
      class="px-8"
    >
      <Search />
    </Button>
  </div>
  <SearchResults {search} {tabSet} />
</div>
