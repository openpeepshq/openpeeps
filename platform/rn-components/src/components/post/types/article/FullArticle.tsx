import React from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import type { Article, PublicPost } from '@openpeepshq/common';
import { minutesToRead } from '@openpeepshq/common/lib';
import { ThemedText } from '../../../ui/themed-text';
import { CachedImage } from '../../../custom/common/index';
import { FullPostLayout } from '../../FullPostLayout';
import { FeedPost } from '../../FeedPost';
import { PostMarkdown } from '../../Markdown';

export interface FullArticleProps {
  post: PublicPost;
}

export const FullArticle = ({ post }: FullArticleProps) => {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const deleteCallback = () => navigation.goBack();
  const article = post.data as Article;
  const minutes = minutesToRead(article.content);

  return (
    <FullPostLayout post={post} deleteCallback={deleteCallback}>
      <FeedPost
        post={post}
        noReactionHeader
        hideReply
        deleteCallback={deleteCallback}
        content={
          <View className="flex w-full flex-col gap-2">
            {article.image ? (
              <CachedImage
                url={article.image}
                className="w-full h-72"
                resizeMode="cover"
              />
            ) : null}
            <View className="mb-6">
              <ThemedText className="text-3xl font-bold">
                {article.title}
              </ThemedText>
              {minutes > 0 && (
                <ThemedText className="text-sm text-muted-foreground">
                  {t('posts.article.minutesToRead', { count: minutes })}
                </ThemedText>
              )}
            </View>
            <PostMarkdown source={article.content ?? ''} />
          </View>
        }
      />
    </FullPostLayout>
  );
};
