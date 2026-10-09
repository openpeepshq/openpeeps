import React from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { PublicPost } from '@openpeepshq/common';
import { FullPostLayout } from '../../FullPostLayout';
import { FeedPost } from '../../FeedPost';
import { PostMarkdown } from '../../Markdown';
import { ResourceCard } from '~/components/resources/ResourceCard';

export interface FullResourceProps {
  post: PublicPost;
}

export const FullResource = ({ post }: FullResourceProps) => {
  const navigation = useNavigation();
  const deleteCallback = () => navigation.goBack();
  const resource = post.data?.type === 'resource' ? post.data : null;

  return (
    <FullPostLayout post={post} deleteCallback={deleteCallback}>
      <FeedPost
        post={post}
        noReactionHeader
        hideReply
        deleteCallback={deleteCallback}
        content={
          <View className="w-full gap-y-3">
            <ResourceCard post={post} />
            {resource?.content ? (
              <PostMarkdown source={resource.content} />
            ) : null}
          </View>
        }
      />
    </FullPostLayout>
  );
};
