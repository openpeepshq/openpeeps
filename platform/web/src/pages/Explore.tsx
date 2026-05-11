import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import type { PublicPost, PublicProfile } from '@openpeeps/common/types';
import { useT, useOpenpeeps } from '@openpeeps/react';
import { FeedPost, ProfileCard } from '@openpeeps/react/components';
import { Button, Input } from '@openpeeps/react-ui';

type Tab = 'members' | 'posts';

const tabFromHash = (hash: string): Tab => {
  if (hash.includes('posts')) return 'posts';
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

  const profilesQuery = openpeepsApi.useSearchProfiles(search);
  const postsQuery = openpeepsApi.useSearchPosts(search);
  const countsQuery = openpeepsApi.useSearchCounts(search);

  const activeQuery = tab === 'posts' ? postsQuery : profilesQuery;

  const items = useMemo(() => {
    return (activeQuery.data?.pages ?? []).flatMap(
      (page) => page as Array<{ data: PublicProfile | PublicPost }>,
    );
  }, [activeQuery.data]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      if (
        entry.isIntersecting &&
        activeQuery.hasNextPage &&
        !activeQuery.isFetchingNextPage
      ) {
        void activeQuery.fetchNextPage();
      }
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, [activeQuery]);

  const triggerSearch = () => {
    setSearch(searchInput);
    setParams({ q: searchInput });
  };

  const switchTab = (next: Tab) => {
    setTab(next);
    window.history.replaceState(null, '', `${window.location.pathname}?q=${search}#${next}`);
  };

  const counts = countsQuery.data;

  return (
    <div className="p-4">
      <div className="flex gap-x-2">
        <Input
          placeholder={t('explore.enterSearchQuery', {
            defaultValue: 'Search for members, posts, groups…',
          })}
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') triggerSearch();
          }}
        />
        <Button
          title={t('explore.SearchButton', { defaultValue: 'Search' })}
          variant="variant-filled-primary"
          action={triggerSearch}
        >
          <Search />
        </Button>
      </div>

      <nav className="mt-4 flex border-b border-border">
        <TabButton
          active={tab === 'members'}
          onClick={() => switchTab('members')}
          count={counts?.profiles}
        >
          {t('explore.members', { defaultValue: 'Members' })}
        </TabButton>
        <TabButton
          active={tab === 'posts'}
          onClick={() => switchTab('posts')}
          count={counts?.posts}
        >
          {t('explore.posts', { defaultValue: 'Posts' })}
        </TabButton>
      </nav>

      <div className="mt-2">
        {search.length <= 2 ? (
          <p className="p-6 text-sm text-muted-foreground">
            {t('explore.startTyping', {
              defaultValue: 'Type at least 3 characters to start searching.',
            })}
          </p>
        ) : items.length === 0 && !activeQuery.isLoading ? (
          <div className="flex w-full items-center justify-center p-4">
            <h2 className="text-lg">
              {tab === 'posts'
                ? t('explore.noPosts', { defaultValue: 'No posts found' })
                : t('explore.noProfiles', {
                    defaultValue: 'No profiles found',
                  })}
            </h2>
          </div>
        ) : (
          <>
            {items.map((item) =>
              tab === 'posts' ? (
                <a
                  key={(item.data as PublicPost).id}
                  href={`/posts/${(item.data as PublicPost).id}`}
                >
                  <FeedPost post={item.data as PublicPost} />
                </a>
              ) : (
                <ProfileCard
                  key={(item.data as PublicProfile).id}
                  profile={item.data as PublicProfile}
                />
              ),
            )}
            <div ref={sentinelRef} aria-hidden="true" className="h-8" />
            {activeQuery.isFetchingNextPage && (
              <div className="flex justify-center py-4 text-sm text-muted-foreground">
                {t('common.loadingMore', { defaultValue: 'Loading more…' })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function TabButton({
  active,
  count,
  onClick,
  children,
}: {
  active: boolean;
  count?: number;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 text-sm ${active ? 'border-b-2 border-primary font-semibold' : 'text-muted-foreground hover:text-foreground'}`}
    >
      {children}
      {typeof count === 'number' && (
        <span className="ml-1 rounded-full bg-surface-200 px-2 py-0.5 text-xs">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  );
}
