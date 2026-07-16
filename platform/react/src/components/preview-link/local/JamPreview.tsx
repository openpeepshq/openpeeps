import { FeedPostContent } from '../../post/FeedPostContent';
import { useOpenpeeps } from '../../../contexts/openpeeps';
import { LoadingSpinner } from '@openpeeps/react-ui';

export interface JamPreviewProps {
  path: string;
}

/**
 * Translation of @openpeeps/svelte/components/core/preview-link/local/
 * JamPreview.svelte. A jam path is `/events/<uuid>/jam`; the underlying event
 * is a post, so render its feed content as the preview.
 */
export function JamPreview({ path }: JamPreviewProps) {
  const eventId = path.substring(8, 44);
  const { openpeepsApi } = useOpenpeeps();
  const postQuery = openpeepsApi.usePost(eventId);

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
