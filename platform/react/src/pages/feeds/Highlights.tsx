import { useT, useOpenpeeps, useSetPageHeader } from '../../index';
import { Feed } from '../../components';
import { useFeedListParams } from '../../hooks';

export function FeedsHighlights() {
  const t = useT();
  const { openpeepsApi } = useOpenpeeps();

  const query = openpeepsApi.useHighlightsFeed(useFeedListParams());

  useSetPageHeader(
    t('navigation.highlights', { defaultValue: 'Community Highlights' }),
  );

  return <Feed query={query} />;
}
