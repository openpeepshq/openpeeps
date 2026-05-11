import { useParams } from 'react-router-dom';
import { useT, useOpenpeeps } from '@openpeeps/react';
import { Feed } from '@openpeeps/react/components';

export function Tags() {
  const t = useT();
  const { hashtag = '' } = useParams<{ hashtag: string }>();
  const { openpeepsApi } = useOpenpeeps();

  const query = openpeepsApi.usePostsByHashtag(hashtag, { limit: 15 });

  return (
    <div className="space-y-4 p-4">
      <h1 className="text-2xl font-semibold">
        {t('tags.title', { defaultValue: `#${hashtag}`, hashtag })}
      </h1>
      <Feed query={query} />
    </div>
  );
}
