import React from 'react';
import { useFeedListParams, useOpenpeeps } from '@openpeepshq/react';
import { TabScreensHeader } from '../../components/custom/index';
import { ThemedText } from '../../components/ui/themed-text';

import { Feed } from '../../components/post/index';
export const ArticlesIndex = () => {
  const { openpeepsApi } = useOpenpeeps();

  const articlesQuery = openpeepsApi.usePostsByType(
    'article',
    useFeedListParams({ limit: 15 })
  );

  return (
    <>
      <TabScreensHeader
        children={
          <ThemedText className="text-xl font-bold">Articles</ThemedText>
        }
      />
      <Feed query={articlesQuery} />
    </>
  );
};
