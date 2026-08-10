import type { PublicPost } from '@openpeepshq/common/types';

import { FeedArticle } from './types/Article';
import { FeedEvent } from './types/Event';
import { FeedNote } from './types/Note';
import { FeedPoll } from './types/Poll';

export interface FeedPostContentProps {
  post: PublicPost;
}

export function FeedPostContent({ post }: FeedPostContentProps) {
  if (post.deletedAt) {
    return (
      <div className="text-sm text-gray-500">This post has been deleted.</div>
    );
  }

  switch (post.type) {
    case 'note':
      return <FeedNote post={post} />;
    case 'question':
      return <FeedPoll post={post} />;
    case 'event':
      return <FeedEvent post={post} />;
    case 'article':
      return <FeedArticle post={post} />;
    default:
      return null;
  }
}
