import { useT, useOpenpeeps, useSetPageHeader } from '../../index';
import { Feed } from '../../components';
import { useFeedListParams } from '../../hooks';

export function FeedsBookmarks() {
  const t = useT();
  const { openpeepsApi } = useOpenpeeps();

  // Bookmarks can be replies; threaded would hide them.
  const query = openpeepsApi.useBookmarkedPosts(
    useFeedListParams({ format: 'linear' }),
  );

  useSetPageHeader(t('navigation.bookmarks', { defaultValue: 'Bookmarks' }));

  return <Feed query={query} formatSwitch={false} />;
}
