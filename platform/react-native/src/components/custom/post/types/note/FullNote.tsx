import React from 'react';
import { buildThreads, PublicPost } from '@openpeeps/common';
import { ThreadedFeed } from '../../feed/threaded/ThreadedFeed';
import { useOpenpeeps } from '@openpeeps/react';
import { useMemo } from 'react';
import { ActivityIndicator } from 'react-native';
import { FeedPost } from '../../feed/chronological/FeedPost';

type FullNoteProps = {
    post: PublicPost;
}

export const FullNote: React.FC<FullNoteProps> = ({ post }) => {
    const { openpeepsApi } = useOpenpeeps();

    let { data: context, isLoading: isLoadingContext } = openpeepsApi.usePostContext(post.id);

    let ancestryThread = useMemo(() => {
        return context && buildThreads(context.ancestors)[0];
    }, [context]);
    let descendentThreads = useMemo(() => {
        return context && buildThreads(context.descendants) || [];
    }, [context]);

    return (
        <>
            {isLoadingContext ? <ActivityIndicator /> : ancestryThread && < ThreadedFeed thread={ancestryThread} isAncestors />}
            <FeedPost post={post} hideReply />
            {isLoadingContext ? <ActivityIndicator /> : descendentThreads.map(thread => <ThreadedFeed key={thread.id} thread={thread} isDescendants />)}
        </>
    );
};
