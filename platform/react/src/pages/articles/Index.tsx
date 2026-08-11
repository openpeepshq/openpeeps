import { useMemo } from 'react';
import { FilePlus } from 'lucide-react';
import {
  useT,
  useOpenpeeps,
  useSetPageHeader,
  useSetPlusButtonActions,
} from '../../index';
import { Feed } from '../../components';

export function ArticlesIndex() {
  const t = useT();
  const { openpeepsApi } = useOpenpeeps();
  const query = openpeepsApi.usePostsByType('article');

  useSetPageHeader(t('navigation.articles', { defaultValue: 'Articles' }));

  const plusButton = useMemo(
    () => ({
      title: t('articles.new', { defaultValue: 'New article' }),
      icon: FilePlus,
      action: '/articles/new',
    }),
    [t],
  );
  useSetPlusButtonActions(plusButton);

  return <Feed query={query} />;
}
