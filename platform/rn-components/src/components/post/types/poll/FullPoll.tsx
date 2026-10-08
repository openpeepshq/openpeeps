import React from 'react';
import type { PublicPost } from '@openpeepshq/common';
import { useNavigation } from '@react-navigation/native';
import { FullPostLayout } from '../../FullPostLayout';
import { FeedPost } from '../../FeedPost';
import { FeedPoll } from '../Poll';

export interface FullPollProps {
  post: PublicPost;
}

export const FullPoll = ({ post }: FullPollProps) => {
  const navigation = useNavigation();
  const deleteCallback = () => navigation.goBack();
  return (
    <FullPostLayout post={post} deleteCallback={deleteCallback}>
      <FeedPost
        post={post}
        noReactionHeader
        hideReply
        deleteCallback={deleteCallback}
        content={<FeedPoll post={post} />}
      />
    </FullPostLayout>
  );
};
