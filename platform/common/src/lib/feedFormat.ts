import { z } from 'zod';

export const FEED_FORMAT_OPTIONS = ['threaded', 'linear'] as const;
export const feedFormatSchema = z.enum(FEED_FORMAT_OPTIONS);
export type FeedFormat = z.infer<typeof feedFormatSchema>;

export const DEFAULT_FEED_FORMAT: FeedFormat = 'threaded';

export const isFeedFormat = (
  value: string | null | undefined,
): value is FeedFormat => value === 'threaded' || value === 'linear';

export const parseFeedFormat = (value?: string | null): FeedFormat =>
  isFeedFormat(value) ? value : DEFAULT_FEED_FORMAT;

/** Profile default, then community default, then threaded. */
export const resolveFeedFormat = (
  profileFormat?: string | null,
  communityFormat?: string | null,
): FeedFormat => {
  if (isFeedFormat(profileFormat)) return profileFormat;
  if (isFeedFormat(communityFormat)) return communityFormat;
  return DEFAULT_FEED_FORMAT;
};
