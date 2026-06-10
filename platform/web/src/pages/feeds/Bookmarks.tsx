import { useT, useOpenpeeps, useSetPageHeader } from '@openpeeps/react';
import { Feed } from '@openpeeps/react/components';

export function FeedsBookmarks() {
  const t = useT();
  const { openpeepsApi } = useOpenpeeps();

  const query = openpeepsApi.useBookmarkedPosts();

  useSetPageHeader(t('navigation.bookmarks', { defaultValue: 'Bookmarks' }));

  return (
    <div className="space-y-4 p-4">
      <Feed query={query} />
    </div>
  );
}
