import { useOpenpeeps } from '../../contexts/openpeeps';
import { useT } from '../../i18n';
import { FullNote } from './types/note/FullNote';
import { FullArticle } from './types/article/FullArticle';
import { FullPoll } from './types/poll/FullPoll';
import { FullEvent } from './types/event/FullEvent';
import { LoadingSpinner } from '@openpeeps/react-ui';

export interface PostDetailProps {
  postId: string;
}

export function PostDetail({ postId }: PostDetailProps) {
  const t = useT();
  const { openpeepsApi } = useOpenpeeps();
  const postQuery = openpeepsApi.usePost(postId);
  const post = postQuery.data;

  if (postQuery.isLoading) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
        <LoadingSpinner />
        </div>
    );
  }

  if (!post) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <p className="text-2xl font-bold">
          {t('post.notFound', { defaultValue: 'Post not found' })}
        </p>
      </div>
    );
  }

  switch (post.type) {
    case 'article':
      return <FullArticle post={post} />;
    case 'event':
      return <FullEvent post={post} />;
    case 'question':
      return <FullPoll post={post} />;
    case 'note':
    default:
      return <FullNote post={post} />;
  }
}
