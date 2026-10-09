import type { PublicPost } from '@openpeepshq/common/types';
import { useT } from '../../i18n';
import { useStaticRender } from '../markdown/staticRender';

import { FeedArticle } from './types/Article';
import { FeedEvent } from './types/Event';
import { FeedNote } from './types/Note';
import { FeedPoll } from './types/Poll';
import { ResourceCard } from '../resources/ResourceCard';

export interface FeedPostContentProps {
  post: PublicPost;
}

export function FeedPostContent({ post }: FeedPostContentProps) {
  const t = useT();
  const staticRender = useStaticRender();
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
      return <FeedPoll post={post} interactive={!staticRender.enabled} />;
    case 'event':
      return <FeedEvent post={post} />;
    case 'article':
      return <FeedArticle post={post} />;
    case 'resource':
      return <ResourceCard post={post} />;
    default:
      return null;
  }
}
