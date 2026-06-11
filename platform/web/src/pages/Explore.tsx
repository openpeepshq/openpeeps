import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2, Search } from 'lucide-react';
import type {
  GroupWithMeta,
  PublicPost,
  PublicProfile,
} from '@openpeeps/common/types';
import { useT, useOpenpeeps, useSetPageHeader } from '@openpeeps/react';
import {
  CardEvent,
  FeedPost,
  GroupCard,
  ProfileCard,
} from '@openpeeps/react/components';
import { Button, Input } from '@openpeeps/react-ui';

type Tab = 'members' | 'posts' | 'jams' | 'events' | 'groups';

const tabFromHash = (hash: string): Tab => {
  if (hash.includes('posts')) return 'posts';
  if (hash.includes('jams')) return 'jams';
  if (hash.includes('events')) return 'events';
  if (hash.includes('groups')) return 'groups';
  return 'members';
};

export function Explore() {
  const t = useT();
  const [params, setParams] = useSearchParams();
  const initialQ = params.get('q') ?? '';
  const [searchInput, setSearchInput] = useState(initialQ);
  const [search, setSearch] = useState(initialQ);
  const [tab, setTab] = useState<Tab>(() =>
    tabFromHash(typeof window !== 'undefined' ? window.location.hash : ''),
  );
  const { openpeepsApi } = useOpenpeeps();
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useSetPageHeader(t('explore.title', { defaultValue: 'Explore' }));

  const profilesQuery = openpeepsApi.useSearchProfiles(search);
  const postsQuery = openpeepsApi.useSearchPosts(search);
  const jamsQuery = openpeepsApi.useSearchJams(search);
  const eventsQuery = openpeepsApi.useSearchEvents(search);
  const groupsQuery = openpeepsApi.useSearchGroups(search);
  const countsQuery = openpeepsApi.useSearchCounts(search);

  const listQuery = useMemo(() => {
    switch (tab) {
      case 'posts':
        return postsQuery;
      case 'jams':
        return jamsQuery;
      case 'events':
        return eventsQuery;
      case 'groups':
        return groupsQuery;
      default:
        return profilesQuery;
    }
  }, [tab, postsQuery, jamsQuery, eventsQuery, groupsQuery, profilesQuery]);

  const profileItems = useMemo(
    () =>
      (profilesQuery.data?.pages ?? [])
        .flat()
        .map((item) => item.data as PublicProfile),
    [profilesQuery.data],
  );

  const postItems = useMemo(
    () =>
      (postsQuery.data?.pages ?? [])
        .flat()
        .map((item) => item.data as PublicPost),
    [postsQuery.data],
  );

  const jamItems = useMemo(
    () =>
      (jamsQuery.data?.pages ?? [])
        .flat()
        .map((item) => item.data as PublicPost),
    [jamsQuery.data],
  );

  const eventItems = useMemo(
    () =>
      (eventsQuery.data?.pages ?? [])
        .flat()
        .map((item) => item.data as PublicPost),
    [eventsQuery.data],
  );

  const groupItems = useMemo(
    () =>
      (groupsQuery.data?.pages ?? [])
        .flat()
        .map((item) => item.data as GroupWithMeta),
    [groupsQuery.data],
  );

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      if (
        entry.isIntersecting &&
        listQuery.hasNextPage &&
        !listQuery.isFetchingNextPage
      ) {
        void listQuery.fetchNextPage();
      }
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, [listQuery]);

  // Mirror Svelte explore: keep the active tab in sync with the URL hash so
  // browser back/forward navigation selects the matching tab.
  useEffect(() => {
    const syncTabFromHash = () => setTab(tabFromHash(window.location.hash));
    window.addEventListener('popstate', syncTabFromHash);
    window.addEventListener('hashchange', syncTabFromHash);
    return () => {
      window.removeEventListener('popstate', syncTabFromHash);
      window.removeEventListener('hashchange', syncTabFromHash);
    };
  }, []);

  const triggerSearch = () => {
    setSearch(searchInput);
    setParams({ q: searchInput });
  };

  const switchTab = (next: Tab) => {
    setTab(next);
    window.history.replaceState(
      null,
      '',
      `${window.location.pathname}?q=${search}#${next}`,
    );
  };

  const counts = countsQuery.data;
  const countsLoading = countsQuery.isLoading || countsQuery.isFetching;

  return (
    <div className="p-4">
      <div className="flex gap-x-2">
        <Input
          placeholder={t('explore.enterSearchQuery', {
            defaultValue: 'Search for members, posts, groups…',
          })}
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          data-testid="explore-search-input"
          onKeyDown={(e) => {
            if (e.key === 'Enter') triggerSearch();
          }}
        />
        <Button
          title={t('explore.SearchButton', { defaultValue: 'Search' })}
          variant="variant-filled-primary"
          action={triggerSearch}
          className="px-8"
        >
          <Search />
        </Button>
      </div>

      <nav className="border-border mt-4 flex flex-wrap border-b">
        <TabButton
          active={tab === 'members'}
          onClick={() => switchTab('members')}
          count={counts?.profiles}
          countLoading={countsLoading}
        >
          {t('explore.tabs.members', { defaultValue: 'Members' })}
        </TabButton>
        <TabButton
          active={tab === 'posts'}
          onClick={() => switchTab('posts')}
          count={counts?.posts}
          countLoading={countsLoading}
        >
          {t('explore.tabs.posts', { defaultValue: 'Posts' })}
        </TabButton>
        <TabButton
          active={tab === 'jams'}
          onClick={() => switchTab('jams')}
          count={counts?.jams}
          countLoading={countsLoading}
        >
          {t('explore.tabs.jams', { defaultValue: 'Jams' })}
        </TabButton>
        <TabButton
          active={tab === 'events'}
          onClick={() => switchTab('events')}
          count={counts?.events}
          countLoading={countsLoading}
        >
          {t('explore.tabs.events', { defaultValue: 'Events' })}
        </TabButton>
        <TabButton
          active={tab === 'groups'}
          onClick={() => switchTab('groups')}
          count={counts?.groups}
          countLoading={countsLoading}
        >
          {t('explore.tabs.groups', { defaultValue: 'Groups' })}
        </TabButton>
      </nav>

      <div className="mt-2">
        {search.length <= 2 ? (
          <p className="text-muted-foreground p-6 text-sm">
            {t('explore.startTyping', {
              defaultValue: 'Type at least 3 characters to start searching.',
            })}
          </p>
        ) : listQuery.isLoading ? (
          <div className="text-muted-foreground flex h-32 items-center justify-center text-sm">
            {t('common.loading', { defaultValue: 'Loading…' })}
          </div>
        ) : tab === 'jams' ? (
          <EventSearchResults
            posts={jamItems}
            emptyMessage={t('explore.noJamsFound', {
              defaultValue: 'No jams found',
            })}
          />
        ) : tab === 'events' ? (
          <EventSearchResults
            posts={eventItems}
            emptyMessage={t('explore.noEventsFound', {
              defaultValue: 'No events found',
            })}
          />
        ) : tab === 'groups' ? (
          <>
            {groupItems.map((group) => (
              <GroupCard key={group.id} group={group} />
            ))}
            {groupItems.length === 0 ? (
              <EmptyResults
                message={t('explore.noGroupsFound', {
                  defaultValue: 'No groups found',
                })}
              />
            ) : null}
          </>
        ) : tab === 'posts' ? (
          <>
            {postItems.map((post) => (
              <a key={post.id} href={`/posts/${post.id}`}>
                <FeedPost post={post} />
              </a>
            ))}
            {postItems.length === 0 ? (
              <EmptyResults
                message={t('explore.noPostsFound', {
                  defaultValue: 'No posts found',
                })}
              />
            ) : null}
          </>
        ) : profileItems.length === 0 ? (
          <EmptyResults
            message={t('explore.noProfilesFound', {
              defaultValue: 'No profiles found',
            })}
            testId="explore-no-profiles-found"
          />
        ) : (
          profileItems.map((profile) => (
            <ProfileCard key={profile.id} profile={profile} />
          ))
        )}
        <div ref={sentinelRef} aria-hidden="true" className="h-8" />
        {listQuery.isFetchingNextPage ? (
          <div className="text-muted-foreground flex justify-center py-4 text-sm">
            {t('common.loadingMore', { defaultValue: 'Loading more…' })}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function EventSearchResults({
  posts,
  emptyMessage,
}: {
  posts: PublicPost[];
  emptyMessage: string;
}) {
  if (posts.length === 0) {
    return <EmptyResults message={emptyMessage} />;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {posts.map((post) => (
        <CardEvent key={post.id} post={post} />
      ))}
    </div>
  );
}

function EmptyResults({
  message,
  testId,
}: {
  message: string;
  testId?: string;
}) {
  return (
    <div className="flex w-full items-center justify-center p-8">
      <h2 className="text-lg" data-testid={testId}>
        {message}
      </h2>
    </div>
  );
}

function TabButton({
  active,
  count,
  countLoading = false,
  onClick,
  children,
}: {
  active: boolean;
  count?: number;
  countLoading?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 text-sm ${active ? 'border-primary border-b-2 font-semibold' : 'text-muted-foreground hover:text-foreground'}`}
    >
      {children}
      {countLoading ? (
        <Loader2 className="ml-1 inline-block h-3 w-3 animate-spin" />
      ) : typeof count === 'number' ? (
        <span className="bg-surface-200 ml-1 rounded-full px-2 py-0.5 text-xs">
          {count > 99 ? '99+' : count}
        </span>
      ) : null}
    </button>
  );
}
