import type { PublicPost } from '@openpeeps/common/types';
import { PostMarkdown } from '../Markdown';
import { Attachments } from '../pieces/Attachments';

export interface FeedPollProps {
  post: PublicPost;
}

interface PollOption {
  content: string;
  type: 'note';
}

interface QuestionData {
  type: 'question';
  content?: string;
  options: PollOption[];
  multiple?: boolean;
  expiresAt?: string;
}

export function FeedPoll({ post }: FeedPollProps) {
  if (post?.data?.type !== 'question') {
    return (
      <h1>
        FeedPoll was used but post type is not "question". Please report this
        to the developers.
      </h1>
    );
  }

  const data = post.data as QuestionData;

  return (
    <div className="space-y-3">
      <PostMarkdown source={data.content} />
      <Attachments post={post} />
      <ul className="space-y-1.5">
        {data.options.map((opt, idx) => (
          <li
            key={idx}
            className="cursor-pointer rounded-md border border-border px-3 py-2 text-sm hover:bg-surface-100"
          >
            {opt.content}
          </li>
        ))}
      </ul>
      {data.expiresAt && (
        <p className="text-xs text-muted-foreground">
          Closes {new Date(data.expiresAt).toLocaleString()}
        </p>
      )}
    </div>
  );
}
