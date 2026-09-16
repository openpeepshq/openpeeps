import React from 'react';
import { useFeedListParams, useOpenpeeps } from '@openpeepshq/react';
import {
  Feed,
  TabScreensHeader,
} from '~/components/custom';
import { ThemedText } from '~/components/ui/themed-text';

export const Articles = () => {
  const { openpeepsApi } = useOpenpeeps();

  const articlesQuery = openpeepsApi.usePostsByType(
    'article',
    useFeedListParams({ limit: 15 }),
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
