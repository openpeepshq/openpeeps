import { useMemo } from 'react';
import type { Thread } from '@openpeepshq/common';
import {
  collectPath,
  lastLongestPathSelector,
} from '../../../../lib/threadHelpers';
import { ThreadPost } from './ThreadPost';

export interface ThreadedFeedProps {
  thread: Thread;
  pathSelector?: (thread: Thread) => Thread & { depth: number };
  isAncestors?: boolean;
}

export function ThreadedFeed({
  thread,
  pathSelector = lastLongestPathSelector,
  isAncestors = false,
}: ThreadedFeedProps) {
  const postList = useMemo(
    () => collectPath(pathSelector(thread)),
    [thread, pathSelector],
  );

  return (
    <div className="w-full">
      {postList.map((post, index) => (
        <a key={post.id} href={`/posts/${post.id}`} className="block w-full">
          <ThreadPost
            post={post}
            // Only continue the rail inside this thread. A gap between
            // top-level replies is intentional — they are separate trees.
            isParent={index !== postList.length - 1 || isAncestors}
            isChild={index !== 0}
          />
        </a>
      ))}
    </div>
  );
}
