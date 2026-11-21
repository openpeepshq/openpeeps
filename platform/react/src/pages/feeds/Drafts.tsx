import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import type { PublicPost } from '@openpeepshq/common/types';
import { useT, useOpenpeeps, useSetPageHeader } from '../../index';
import { Feed, type FeedQuery } from '../../components';

const matches = (post: PublicPost, needle: string): boolean => {
  const haystack = (post.data?.content ?? '').toLowerCase();
  return haystack.includes(needle);
};

export function FeedsDrafts() {
  const t = useT();
  const { openpeepsApi } = useOpenpeeps();
  const [filter, setFilter] = useState('');

  const query = openpeepsApi.useMyDrafts();

  // The drafts list is small and fully local; filtering the already-fetched
  // pages client-side keeps the text box responsive without a server round.
  const filtered = useMemo<FeedQuery>(() => {
    const needle = filter.trim().toLowerCase();
    if (!needle || !query.data) return query;
    const pages = query.data.pages.map((page) =>
      page.filter((post) => matches(post, needle)),
    );
    return { ...query, data: { ...query.data, pages } };
  }, [query, filter]);

  useSetPageHeader(t('common.entities.drafts', { defaultValue: 'Drafts' }));

  return (
    <div className="flex min-h-full flex-col gap-4">
      <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-border bg-background p-4">
        <div className="relative w-full max-w-sm">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <input
            type="search"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder={t('feeds.drafts.filter', {
              defaultValue: 'Filter your drafts…',
            })}
            className="border-input bg-surface placeholder:text-muted-foreground focus:ring-ring w-full rounded-md border py-2 pr-3 pl-9 text-sm outline-none focus:ring-1"
          />
        </div>
      </div>
      <Feed query={filtered} formatSwitch={false} />
    </div>
  );
}
