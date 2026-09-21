import type { PostWithMeta } from '@openpeepshq/common/types';

export const pollEndDelayMs = (expiresAt: string, now = Date.now()) =>
  new Date(expiresAt).getTime() - now;

export const shouldEmitPollEnded = (
  post: PostWithMeta | undefined,
  scheduledExpiresAt: string,
): post is PostWithMeta =>
  !!post &&
  post.data?.type === 'question' &&
  post.data.expiresAt === scheduledExpiresAt;
