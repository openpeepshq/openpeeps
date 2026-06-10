import type { PublicPost } from '@openpeeps/common/types';
import { FullPostLayout } from '../../FullPostLayout';

export interface FullNoteProps {
  post: PublicPost;
}

export function FullNote({ post }: FullNoteProps) {
  return (
    <FullPostLayout
      post={post}
      deleteCallback={() => window.history.back()}
    />
  );
}
