import type { PublicPost } from '@openpeeps/common/types';
import { PostMarkdown } from '../Markdown';
import { Attachments } from '../pieces/Attachments';

export interface FeedNoteProps {
  post: PublicPost;
}

export function FeedNote({ post }: FeedNoteProps) {
  if (post?.data?.type !== 'note') {
    return (
      <h1>
        FeedNote was used but post type is not "note". Please report this to
        the developers.
      </h1>
    );
  }

  const data = post.data as { content?: string };

  return (
    <div>
      <PostMarkdown source={data.content} />
      <Attachments post={post} />
    </div>
  );
}
