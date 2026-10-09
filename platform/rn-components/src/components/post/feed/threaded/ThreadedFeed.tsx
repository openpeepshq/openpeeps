import React, { useMemo } from 'react';
import { ThemedView } from '../../../ui/themed-view';
import { MainStackParamList } from '../../../navigation/types/index';
import { Thread } from '@openpeepshq/common';
import { Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { collectPath, lastLongestPathSelector } from '../../../../lib/post';
import { ThreadPost } from './ThreadPost';

type ThreadedFeedProps = {
  thread: Thread;
  pathSelector?: (thread: Thread) => Thread;
  isAncestors?: boolean;
};

export const ThreadedFeed: React.FC<ThreadedFeedProps> = ({
  thread,
  pathSelector = lastLongestPathSelector,
  isAncestors = false,
}: ThreadedFeedProps) => {
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();

  const postList = useMemo(
    () => collectPath(pathSelector(thread)),
    [thread, pathSelector]
  );

  return (
    <ThemedView className="grow w-full">
      {postList.map((post, index) => (
        <Pressable
          className="w-full"
          key={post.id}
          onPress={() => navigation.navigate('Post', { id: post.id })}
        >
          <ThreadPost
            post={post}
            isParent={index !== postList.length - 1 || isAncestors}
            isChild={index !== 0}
          />
        </Pressable>
      ))}
    </ThemedView>
  );
};
