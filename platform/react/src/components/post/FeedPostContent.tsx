import type { PublicPost } from '@openpeepshq/common/types';
import { useT } from '../../i18n';

import { FeedArticle } from './types/Article';
import { FeedEvent } from './types/Event';
import { FeedNote } from './types/Note';
import { FeedPoll } from './types/Poll';

export interface FeedPostContentProps {
  post: PublicPost;
}

export function FeedPostContent({ post }: FeedPostContentProps) {
  const t = useT();
  if (post.hidden) {
    return (
      <div className="text-muted-foreground text-sm">
        {t('posts.hiddenMessage', { defaultValue: 'Hidden message' })}
      </div>
    );
  }
  if (post.deletedAt) {
    return (
      <div className="text-muted-foreground text-sm">
        This post has been deleted.
      </div>
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
