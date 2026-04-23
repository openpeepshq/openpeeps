import { type PublicPost } from '@openpeeps/common';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainStackParamList } from '~/components/navigation/types';
import {
    PostHeader,
    PostActions,
    FeedPostContent,
    PostReactionHeader,
} from '../../pieces';
import React from 'react';
import { ThreadPost } from '../threaded/ThreadPost';
import { ThemedView } from '~/components/ui/themed-view';

interface FeedPostProps {
    post: PublicPost;
    accessible?: boolean;
    hideReply?: boolean;
    previewMode?: boolean;
    showMenu?: boolean;
    inGroup?: boolean;
    refetch?: () => void;
    showReplyTo?: boolean;
    showReactionHeader?: boolean;
}

export const FeedPost = ({
    post,
    hideReply,
    previewMode = false,
    showMenu = true,
    inGroup = false,
    showReplyTo = false,
    showReactionHeader = true,
}: FeedPostProps) => {
    const navigation =
        useNavigation<NativeStackNavigationProp<MainStackParamList>>();

    const displayedPost = post.repost || post;

    if (!post) { return null; }

    const handlePostPress = () => {
        navigation.navigate('Post', {
            id: displayedPost.id,
        });
    };

    if (!displayedPost?.profile) {
        return <></>;
    }

    return (
        <ThemedView className="py-5 border-b border-border">
            {showReactionHeader && (

                <PostReactionHeader
                    post={post}
                    inGroup={inGroup}
                    hideReply={hideReply}
                    previewMode={previewMode}
                />
            )}
            {post.replyTo && showReplyTo ? (
                <ThreadPost
                    post={post.replyTo as PublicPost}
                    isParent={true}
                    isChild={false}
                    noActions={true}
                    noMenu={true}
                />
            ) : null}

            <PostHeader
                post={displayedPost}
                showMenu={!post.repost && !post.inReplyToId && !previewMode && showMenu}
            />

            <ThemedView className="px-5">
                <FeedPostContent post={displayedPost} />
            </ThemedView>
            <PostActions
                post={displayedPost}
                previewMode={previewMode}
                onPostPress={handlePostPress}
            />
        </ThemedView>
    );
};
