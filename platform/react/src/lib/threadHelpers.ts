import { dateSorter, type PublicPost, type Thread } from '@openpeeps/common';

export const lastLongestPathSelector = (
  thread: Thread,
): Thread & { depth: number } => {
  const candidates = thread.children.map((t) => lastLongestPathSelector(t));
  const maxDepth = Math.max(0, ...candidates.map((c) => c.depth));
  const selectedChild = candidates
    .filter((c) => c.depth === maxDepth)
    .sort(dateSorter())
    .reverse()[0];

  return {
    ...thread,
    children: selectedChild ? [selectedChild] : [],
    depth: maxDepth + 1,
  };
};

export const collectPath = (
  thread: Thread | undefined,
  currentPath: PublicPost[] = [],
): PublicPost[] => {
  if (!thread) return currentPath;
  return [
    ...currentPath,
    thread,
    ...collectPath(thread.children[0]),
  ];
};
