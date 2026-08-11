import { useParams } from 'react-router-dom';
import { useT, useOpenpeeps, useSetPageHeader } from '../index';
import {
  Feed,
  useDefaultVisibility,
  useNewNotePlusButton,
} from '../components';

export function Tags() {
  const t = useT();
  const { hashtag = '' } = useParams<{ hashtag: string }>();
  const { openpeepsApi } = useOpenpeeps();
  const visibility = useDefaultVisibility();

  useNewNotePlusButton({ visibility });

  const query = openpeepsApi.usePostsByHashtag(hashtag);

  useSetPageHeader(t('tags.title', { defaultValue: '#{{hashtag}}', hashtag }));

  return <Feed query={query} />;
}
