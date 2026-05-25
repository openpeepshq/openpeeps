import { useParams } from 'react-router-dom';
import { useT, useOpenpeeps, useSetPageHeader } from '@openpeeps/react';
import { Feed } from '@openpeeps/react/components';

export function Tags() {
  const t = useT();
  const { hashtag = '' } = useParams<{ hashtag: string }>();
  const { openpeepsApi } = useOpenpeeps();

  const query = openpeepsApi.usePostsByHashtag(hashtag, { limit: 15 });

  useSetPageHeader(t('tags.title', { defaultValue: `#${hashtag}`, hashtag }));

  return (
    <div className="space-y-4 p-4">
      <Feed query={query} />
    </div>
  );
}
