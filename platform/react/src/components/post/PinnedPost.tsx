import { Pin } from 'lucide-react';
import { useOpenpeeps } from '../../contexts/openpeeps';
import { useT } from '../../i18n';
import { FeedPost } from './FeedPost';

export interface PinnedPostProps {
  pinnedPostId: string;
  inGroup?: boolean;
}

export function PinnedPost({ pinnedPostId, inGroup = false }: PinnedPostProps) {
  const t = useT();
  const { openpeepsApi } = useOpenpeeps();
  const postQuery = openpeepsApi.usePost(pinnedPostId);
  const post = postQuery.data;

  if (postQuery.isLoading || !post) return null;

  const href = `/posts/${post.repost ? post.repost.id : post.id}`;

  return (
    <a href={href} className="bg-surface-100 block">
      <div className="px-5 pt-3 text-sm">
        <Pin className="mr-1 inline-block size-4" />
        {t('feed.pinned', { defaultValue: 'Pinned post' })}
      </div>
      <FeedPost post={post} inGroup={inGroup} />
    </a>
  );
}
