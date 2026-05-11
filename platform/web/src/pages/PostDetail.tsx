import { useParams } from 'react-router-dom';
import { PostDetail as PostDetailComponent } from '@openpeeps/react/components';

export function PostDetail() {
  const { postId = '' } = useParams<{ postId: string }>();
  return <PostDetailComponent postId={postId} />;
}
