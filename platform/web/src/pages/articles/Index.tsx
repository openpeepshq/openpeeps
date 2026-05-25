import { useT, useOpenpeeps, useSetPageHeader } from '@openpeeps/react';
import { Feed } from '@openpeeps/react/components';

export function ArticlesIndex() {
  const t = useT();
  const { openpeepsApi } = useOpenpeeps();
  const query = openpeepsApi.usePostsByType('article', { limit: 15 });

  useSetPageHeader(t('navigation.articles', { defaultValue: 'Articles' }));

  return (
    <div className="space-y-4 p-4">
      <a
        href="/articles/new"
        className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:opacity-90"
      >
        {t('articles.new', { defaultValue: 'New article' })}
      </a>
      <Feed query={query} />
    </div>
  );
}
