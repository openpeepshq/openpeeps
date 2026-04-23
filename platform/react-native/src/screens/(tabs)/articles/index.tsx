import React from 'react';
import { useOpenpeeps } from '@openpeeps/react';
import {
  Feed,
  TabScreensHeader,
} from '../../../components/custom';
import { ThemedText } from '../../../components/ui/themed-text';

export const Articles = () => {
  const { openpeepsApi } = useOpenpeeps();

  const articlesQuery = openpeepsApi.usePostsByType('article', { limit: 15 });

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
