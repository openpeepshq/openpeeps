import React from 'react';
import { useMemo } from 'react';
import { View } from 'react-native';
import { PinIcon } from '~/components/icons';
import { ThemedText } from '~/components/ui/themed-text';
import { PostMenu } from '../../pieces';
import { FeedPost } from './FeedPost';
import { useOpenpeeps } from '@openpeeps/react';


interface PinnedPostProps {
    postId: string;
    inGroup?: boolean;
}

export const PinnedPost = ({
    postId,
    inGroup = false,
}: PinnedPostProps) => {
    const { openpeepsApi } = useOpenpeeps();
    const postQuery = openpeepsApi.usePost(postId);


    const post = useMemo(() => {
        return postQuery.data;
    }, [postQuery.data]);

    return (
        post && (
            <>
                <View className="flex-row justify-between items-center pt-2 px-2">
                    <View className="flex-row gap-x-2 ">
                        <PinIcon className="text-muted-foreground" size={20} />
                        <ThemedText className="text-sm font-semibold text-foreground">
                            Pinned post
                        </ThemedText>
                    </View>
                    <PostMenu post={post} />
                </View>
                <FeedPost
                    post={post}
                    showMenu={false}
                    inGroup={inGroup}
                />
            </>
        ) || null
    );
};
