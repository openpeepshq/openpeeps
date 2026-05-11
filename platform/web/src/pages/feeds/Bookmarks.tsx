import { useT, useOpenpeeps } from '@openpeeps/react';
import { Feed } from '@openpeeps/react/components';

export function FeedsBookmarks() {
  const t = useT();
  const { openpeepsApi } = useOpenpeeps();

  const query = openpeepsApi.useBookmarkedPosts({ limit: 15 });

  return (
    <div className="space-y-4 p-4">
      <h1 className="text-2xl font-semibold">
        {t('navigation.bookmarks', { defaultValue: 'Bookmarks' })}
      </h1>
      <Feed query={query} />
    </div>
  );
}
