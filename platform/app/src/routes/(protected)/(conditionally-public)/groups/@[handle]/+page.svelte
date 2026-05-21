<script lang="ts">
  // @ts-nocheck
  import { getPageHeaderStore } from '@openpeeps/svelte/stores';
  import {
    AccessDeniedLoader,
    OpenpeepsMarkdown,
    GroupEvents,
    GroupPageHeader,
  } from '@openpeeps/svelte/components';
  import {
    groupByHandleStore,
    upcomingGroupEventsFeedStore,
    pastGroupEventsFeedStore,
  } from '@openpeeps/svelte/api';
  import { groupName } from '@openpeeps/common/lib';
  import { GroupFeed } from '@openpeeps/svelte/components';
  import { Tab, TabGroup } from '@skeletonlabs/skeleton';
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { i18nContext } from '@openpeeps/svelte/components';
  import { onDestroy } from 'svelte';
  const { t } = i18nContext();

  let handle = page.params.handle;

  let groupQuery = groupByHandleStore(handle);

  let group = $derived($groupQuery.data);
  const upcomingEventsQuery = $derived(
    group?.id ? upcomingGroupEventsFeedStore(group.id, 15) : undefined,
  );
  const pastEventsQuery = $derived(
    group?.id ? pastGroupEventsFeedStore(group.id, 15) : undefined,
  );

  const pageHeaderStore = getPageHeaderStore();

  let tabSet: number = $state(0);

  if (page.url.hash.includes('posts')) {
    tabSet = 0;
  } else if (page.url.hash.includes('events')) {
    tabSet = 1;
  } else if (page.url.hash.includes('description')) {
    tabSet = 2;
  } else {
    tabSet = 0;
  }

  let visibilityValue = $derived(
    group?.capabilities?.none?.add?.includes('core-groups-read')
      ? 'public'
      : group?.capabilities?.local?.add?.includes('core-groups-read')
        ? 'local'
        : 'private',
  );
  let postsVisibilityValue = $derived(
    group?.capabilities?.none?.add?.includes('core-posts-read')
      ? 'public'
      : group?.capabilities?.local?.add?.includes('core-posts-read')
        ? 'local'
        : 'private',
  );
  let whoCanJoinValue = $derived(
    group?.capabilities?.local?.add?.includes('core-groups-join')
      ? 'open'
      : 'closed',
  );
  let whoCanPostValue = $derived(
    group?.capabilities?.member?.add?.includes('core-posts-create-*')
      ? 'members'
      : 'moderators',
  );
  let whoCanPostEventsValue = $derived(
    group?.capabilities?.member?.remove?.includes('core-posts-create-event')
      ? 'moderators'
      : 'members',
  );

  $effect(() => {
    if (group) {
      pageHeaderStore.set({ title: groupName(group) });
    }
  });
  onDestroy(() => {
    pageHeaderStore.set(undefined);
  });
</script>

<AccessDeniedLoader queries={[$groupQuery]}>
  {#if group}
    <GroupPageHeader {group} />
    <div class="">
      <TabGroup>
        <Tab
          bind:group={tabSet}
          name="tab1"
          on:click={async () =>
            await goto('#posts', {
              replaceState: true,
            })}
          value={0}
        >
          <span class="text-sm">{t('groups.sections.posts')}</span>
        </Tab>
        <Tab
            bind:group={tabSet}
            name="tab2"
            on:click={async () =>
              await goto('#events', {
                replaceState: true,
              })}
            value={1}
          >
            <span class="text-sm">{t('groups.sections.events')}</span>
        </Tab>
        <Tab
          bind:group={tabSet}
          name="tab3"
          on:click={async () =>
            await goto('#description', {
              replaceState: true,
            })}
          value={2}
        >
          <span class="text-sm">{t('groups.sections.description')}</span>
        </Tab>
        {#snippet panel()}
          {#if tabSet === 0}
            <GroupFeed {group} />
          {/if}
          {#if tabSet === 1 && upcomingEventsQuery && pastEventsQuery}
            <GroupEvents
              {group}
              upcomingQuery={upcomingEventsQuery}
              pastQuery={pastEventsQuery}
            />
          {/if}
          {#if tabSet === 2}
            <div class="space-y-2 p-4">
              <div class="border-b py-2">
                <h3 class="text-lg font-semibold">Description</h3>
                <OpenpeepsMarkdown
                  source={group?.description || 'No description yet'}
                  linkPreviewMode="none"
                />
              </div>
              <div class="space-y-2 border-b py-2">
                <h3 class="text-lg font-semibold">Details</h3>
                <div class="">
                  <h3 class="font-semibold">Created</h3>
                  <p>
                    {new Date(group?.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div class="">
                  <h3 class="font-semibold">{t('groups.visibility.title')}</h3>
                  <p>
                    {t(`groups.visibility.${visibilityValue}.description`)}
                  </p>
                </div>
                <div class="">
                  <h3 class="font-semibold">{t('groups.whoCanJoin.title')}</h3>
                  <p>
                    {t(`groups.whoCanJoin.${whoCanJoinValue}.description`)}
                  </p>
                </div>
                <div class="">
                  <h3 class="font-semibold">{t('groups.whoCanPost.title')}</h3>
                  <p>
                    {t(`groups.whoCanPost.${whoCanPostValue}.description`)}. {t(
                      `groups.whoCanPostEvents.${whoCanPostEventsValue}.description`,
                    )}
                  </p>
                </div>
                <div class="">
                  <h3 class="font-semibold">
                    {t('groups.postsVisibility.title')}
                  </h3>
                  <p>
                    {t(
                      `groups.postsVisibility.${postsVisibilityValue}.description`,
                    )}
                  </p>
                </div>
              </div>
              <div class="border-b py-2">
                <h3 class="text-lg font-semibold">Rules</h3>
                <OpenpeepsMarkdown
                  source={group?.rules || 'No rules yet'}
                  linkPreviewMode="none"
                />
              </div>
            </div>
          {/if}
        {/snippet}
      </TabGroup>
    </div>
  {/if}
</AccessDeniedLoader>
