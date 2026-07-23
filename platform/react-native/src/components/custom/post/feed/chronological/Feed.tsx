import { View, ScrollView, RefreshControl } from 'react-native';
import React from 'react';
import type { PublicPost } from '@openpeeps/common';
import { useFocusEffect } from '@react-navigation/native';
import { handleScroll } from '~/lib/utils';
import { PinnedPost } from './PinnedPost';
import { FeedPost } from './FeedPost';
import { EmptyStateContainerType, InfiniteQueryResult } from '~/types';
import { CustomLoader, EmptyStateContainer } from '~/components/custom';


interface Props {
    query: InfiniteQueryResult<PublicPost>;
    pinnedPostId?: string;
    refetchServerInfo?: () => void;
    isPostFeed?: boolean;
    type?: EmptyStateContainerType;
    inGroup?: boolean;
}

export const Feed = ({
    query,
    pinnedPostId,
    refetchServerInfo,
    isPostFeed = true,
    type = "posts",
    inGroup = false,
}: Props) => {
    const [refreshing, setRefreshing] = React.useState(false);
    const refetchRef = React.useRef(query.refetch);
    refetchRef.current = query.refetch;

    const allPosts: PublicPost[] = React.useMemo(() => {
        if (!query.data?.pages) { return []; }
        return query.data.pages.flat().filter(p => p.id !== pinnedPostId);
    }, [query.data?.pages, pinnedPostId]);

    useFocusEffect(
        React.useCallback(() => {
            refetchRef.current();
        }, []),
    );

    const onRefresh = React.useCallback(async () => {
        setRefreshing(true);
        await refetchRef.current();
        refetchServerInfo && (refetchServerInfo());
        setRefreshing(false);
    }, [refetchServerInfo]);

    const content = (
        <>
            {query.isLoading &&
                Array.from({ length: 5 }).map((_, index) => {
                    return <CustomLoader key={`skeleton-${index}`} page="community" />;
                })}
            {!query.isLoading && query.isFetched && (
                <>
                    {pinnedPostId && (
                        <PinnedPost postId={pinnedPostId} inGroup={inGroup} />
                    )}
                    <View>
                        {allPosts?.map((p) => {
                            return (
                                <FeedPost
                                    key={p.id}
                                    post={p as PublicPost}
                                    showReplyTo={true}
                                    inGroup={inGroup}
                                />
                            );
                        })}
                    </View>
                    {
                        allPosts.length === 0 && (
                            <EmptyStateContainer type={type}/>
                        )
                    }
                    {query.isFetchingNextPage && <CustomLoader page="community" />}
                </>
            )}
        </>
    );

    if (!isPostFeed) {
        return content;
    }

    return (
        <ScrollView
            className="bg-background"
            onScroll={({ nativeEvent }) => handleScroll(nativeEvent, query)}
            scrollEventThrottle={16}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }>
            {content}
        </ScrollView>
    );
};
