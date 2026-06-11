import { FeedPostContent } from '../../post/FeedPostContent';
import { useOpenpeeps } from '../../../contexts/openpeeps';
import { useT } from '../../../i18n';

export interface JamPreviewProps {
  path: string;
}

/**
 * Translation of @openpeeps/svelte/components/core/preview-link/local/
 * JamPreview.svelte. A jam path is `/events/<uuid>/jam`; the underlying event
 * is a post, so render its feed content as the preview.
 */
export function JamPreview({ path }: JamPreviewProps) {
  const t = useT();
  const eventId = path.substring(8, 44);
  const { openpeepsApi } = useOpenpeeps();
  const postQuery = openpeepsApi.usePost(eventId);

  if (postQuery.isLoading) {
    return (
      <p className="text-muted-foreground text-sm">
        {t('common.loading', { defaultValue: 'Loading…' })}
      </p>
    );
  }

  if (!postQuery.data) return null;

  return <FeedPostContent post={postQuery.data} />;
}
