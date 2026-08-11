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
  isDescendants?: boolean;
  /** Another sibling thread follows, so the last post keeps its rail running down. */
  continuesBelow?: boolean;
}

export function ThreadedFeed({
  thread,
  pathSelector = lastLongestPathSelector,
  isAncestors = false,
  isDescendants = false,
  continuesBelow = false,
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
            isParent={
              index !== postList.length - 1 || isAncestors || continuesBelow
            }
            isChild={index !== 0 || isDescendants}
          />
        </a>
      ))}
    </div>
  );
}
