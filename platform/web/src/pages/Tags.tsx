import { useParams } from 'react-router-dom';
import { useT, useOpenpeeps, useSetPageHeader } from '@openpeepshq/react';
import {
  Feed,
  useDefaultVisibility,
  useNewNotePlusButton,
} from '@openpeepshq/react/components';

export function Tags() {
  const t = useT();
  const { hashtag = '' } = useParams<{ hashtag: string }>();
  const { openpeepsApi } = useOpenpeeps();
  const visibility = useDefaultVisibility();

  useNewNotePlusButton({ visibility });

  const query = openpeepsApi.usePostsByHashtag(hashtag);

  useSetPageHeader(t('tags.title', { defaultValue: '#{{hashtag}}', hashtag }));

  return (
    <div className="space-y-4 p-4">
      <Feed query={query} />
    </div>
  );
}
