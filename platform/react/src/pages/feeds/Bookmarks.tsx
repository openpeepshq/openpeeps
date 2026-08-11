import { useT, useOpenpeeps, useSetPageHeader } from '../../index';
import { Feed } from '../../components';

export function FeedsBookmarks() {
  const t = useT();
  const { openpeepsApi } = useOpenpeeps();

  const query = openpeepsApi.useBookmarkedPosts();

  useSetPageHeader(t('navigation.bookmarks', { defaultValue: 'Bookmarks' }));

  return <Feed query={query} />;
}
