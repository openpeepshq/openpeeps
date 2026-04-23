import React from 'react';
import {CachedVideoPlayer} from '../../../components/custom/common/cached-video-player';
import {ThemedView} from '../../../components/ui/themed-view';

import {MainScreenProps} from '../../../components/navigation/types';

type PostProps = MainScreenProps<'VideoPlayer'>;

export const VideoPlayer: React.FC<PostProps> = ({route}) => {
  const {url, title} = route.params;
  return (
    <ThemedView className="flex-1">
      <CachedVideoPlayer url={url} title={title} />
    </ThemedView>
  );
};
