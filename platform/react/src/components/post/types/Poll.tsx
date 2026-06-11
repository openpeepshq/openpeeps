import type { PublicPost } from '@openpeeps/common/types';
import { PostMarkdown } from '../Markdown';
import { Attachments } from '../pieces/Attachments';
import { PollContent } from '../pieces/PollContent';

export interface FeedPollProps {
  post: PublicPost;
  /** When false, show static options only (e.g. email previews). */
  interactive?: boolean;
}

export function FeedPoll({ post, interactive = true }: FeedPollProps) {
  if (post?.data?.type !== 'question') {
    return (
      <p className="text-error text-sm">
        FeedPoll was used for a non-question post.
      </p>
    );
  }

  const data = post.data;

  return (
    <div className="space-y-3">
      {data.content ? (
        <PostMarkdown
          source={data.content}
          mentions={post.mentions}
          linkPreviewMode={
            data.attachments?.length ? 'none' : 'append'
          }
        />
      ) : null}
      <Attachments post={post} />
      {interactive ? (
        <PollContent post={post} />
      ) : (
        <>
          <ul className="space-y-1.5">
            {data.options.map((opt, idx) => (
              <li
                key={idx}
                className="rounded-md border border-border px-3 py-2 text-sm"
              >
                {opt.content}
              </li>
            ))}
          </ul>
          {data.expiresAt ? (
            <p className="text-muted-foreground text-xs">
              Closes {new Date(data.expiresAt).toLocaleString()}
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}
