import type { PublicPost } from '@openpeepshq/common/types';
import { FullPostLayout } from '../../FullPostLayout';
import { FeedPost } from '../../FeedPost';
import { FeedPoll } from '../Poll';

export interface FullPollProps {
  post: PublicPost;
}

export function FullPoll({ post }: FullPollProps) {
  return (
    <FullPostLayout
      post={post}
      deleteCallback={() => window.history.back()}
    >
      <FeedPost
        post={post}
        noReactionHeader
        deleteCallback={() => window.history.back()}
        content={<FeedPoll post={post} interactive />}
      />
    </FullPostLayout>
  );
}
