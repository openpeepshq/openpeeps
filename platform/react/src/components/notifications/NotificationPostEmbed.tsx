import type { PublicPost } from '@openpeeps/common/types';
import { FeedPostContent } from '../post/FeedPostContent';

export function NotificationPostEmbed({ post }: { post: PublicPost }) {
  return (
    <div className="bg-surface-100 mt-2 rounded-md border p-2">
      <FeedPostContent post={post} />
    </div>
  );
}
