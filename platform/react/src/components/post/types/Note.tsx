import type { PublicPost } from '@openpeepshq/common/types';
import { OpenpeepsMarkdown } from '../../markdown/OpenpeepsMarkdown';
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
      <OpenpeepsMarkdown
        source={data.content}
        mentions={post.mentions}
        linkPreviewMode={
          post.data.attachments?.length ? 'none' : 'append'
        }
      />
      <Attachments post={post} />
    </div>
  );
}
