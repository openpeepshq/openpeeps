import React, { useMemo } from 'react';
import { ThemedView } from '~/components/ui/themed-view';
import { MainStackParamList } from '~/components/navigation/types';
import { Thread } from '@openpeepshq/common';
import { Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { collectPath, lastLongestPathSelector } from '~/lib/post';
import { ThreadPost } from './ThreadPost';

type ThreadedFeedProps = {
    thread: Thread;
    pathSelector?: (thread: Thread) => Thread;
    isAncestors?: boolean;
    isDescendants?: boolean;
};

export const ThreadedFeed: React.FC<ThreadedFeedProps> = ({
    thread,
    pathSelector = lastLongestPathSelector,
    isAncestors = false,
    isDescendants = false,
}: ThreadedFeedProps) => {
    const navigation =
        useNavigation<NativeStackNavigationProp<MainStackParamList>>();

    const postList = useMemo(() =>
        collectPath(pathSelector(thread)), [thread, pathSelector]);

    return (
        <ThemedView className="w-full" style={{ flexGrow: 1 }}>
            {postList.map((post, index) => (
                <Pressable className="w-full" key={post.id} onPress={() => navigation.navigate('Post', { id: post.id })}>
                    <ThreadPost
                        post={post}
                        isParent={index !== postList.length - 1 || isAncestors}
                        isChild={index !== 0 || isDescendants}
                    />
                </Pressable>)
            )}
        </ThemedView>
    );
};
