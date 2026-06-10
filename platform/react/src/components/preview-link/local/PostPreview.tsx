import { FeedPostContent } from '../../post/FeedPostContent';
import { useOpenpeeps } from '../../../contexts/openpeeps';
import { useT } from '../../../i18n';

export interface PostPreviewProps {
  path: string;
}

export function PostPreview({ path }: PostPreviewProps) {
  const t = useT();
  const postId = path.substring(7);
  const { openpeepsApi } = useOpenpeeps();
  const postQuery = openpeepsApi.usePost(postId);

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
