import { useParams } from 'react-router-dom';
import { useT, useOpenpeeps, useSetPageHeader } from '../index';
import {
  Feed,
  useDefaultVisibility,
  useNewNotePlusButton,
} from '../components';
import { useFeedListParams } from '../hooks';

export function Tags() {
  const t = useT();
  const { hashtag = '' } = useParams<{ hashtag: string }>();
  const { openpeepsApi } = useOpenpeeps();
  const visibility = useDefaultVisibility();

  useNewNotePlusButton({ visibility });

  // Hashtag hits can be replies; threaded would hide them.
  const query = openpeepsApi.usePostsByHashtag(
    hashtag,
    useFeedListParams({ format: 'linear' }),
  );

  useSetPageHeader(t('tags.title', { defaultValue: '#{{hashtag}}', hashtag }));

  return <Feed query={query} formatSwitch={false} />;
}
