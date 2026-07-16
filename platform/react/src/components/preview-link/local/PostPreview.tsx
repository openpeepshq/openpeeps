import { FeedPostContent } from '../../post/FeedPostContent';
import { useOpenpeeps } from '../../../contexts/openpeeps';
import { LoadingSpinner } from '@openpeeps/react-ui';

export interface PostPreviewProps {
  path: string;
}

export function PostPreview({ path }: PostPreviewProps) {
  const postId = path.substring(7);
  const { openpeepsApi } = useOpenpeeps();
  const postQuery = openpeepsApi.usePost(postId);

  if (postQuery.isLoading) {
    return (
      <div className="text-muted-foreground text-sm">
        <LoadingSpinner />
      </div>
    );
  }

  if (!postQuery.data) return null;

  return <FeedPostContent post={postQuery.data} />;
}
