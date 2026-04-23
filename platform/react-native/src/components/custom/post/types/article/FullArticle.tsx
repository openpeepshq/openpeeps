import React from 'react';
import { useMemo } from 'react';
import { buildThreads, type Article, type PublicPost } from '@openpeeps/common';
import { useOpenpeeps } from '@openpeeps/react';
import { ThreadedFeed } from '../../feed/threaded/ThreadedFeed';
import { ActivityIndicator, Image, View } from 'react-native';
import { ThemedText } from '../../../../ui/themed-text';
import { PostActions, PostHeader } from '../../pieces';
import { OpenPeepsMarkdown, CachedImage } from '../../..';

type FullArticleProps = {
    post: PublicPost;
}

export const FullArticle: React.FC<FullArticleProps> = ({ post }) => {
    const { openpeepsApi } = useOpenpeeps();

    let { data: context, isLoading: isLoadingContext } = openpeepsApi.usePostContext(post.id);

    let article = post.data as Article;

    let ancestryThread = useMemo(() => {
        return context && buildThreads(context.ancestors)[0];
    }, [context]);
    let descendentThreads = useMemo(() => {
        return context && buildThreads(context.descendants) || [];
    }, [context]);

    return (
        <>
            {isLoadingContext ? <ActivityIndicator /> : ancestryThread && < ThreadedFeed thread={ancestryThread} isAncestors />}
            <PostHeader post={post} />
            <View className="flex w-full flex-col gap-2 p-5">
                {article.image && (
                    <CachedImage
                        url={article.image}
                        className="w-full h-72"
                        resizeMode="cover" 
                    />
                )}
                <ThemedText className="text-3xl font-bold">{article.title}</ThemedText>
                <View>
                    <OpenPeepsMarkdown
                        source={article.content || ''}
                        linkPreviewMode="none"
                    />
                </View>
            </View>
            <PostActions post={post} />
            {isLoadingContext ? <ActivityIndicator /> : descendentThreads.map(thread => <ThreadedFeed key={thread.id} thread={thread} isDescendants />)}
        </>
    );
};
