import { useParams } from 'react-router-dom';
import { profileName } from '@openpeepshq/common';
import { useT, useOpenpeeps, useSetPageHeader } from '../index';
import { PostDetail as PostDetailComponent } from '../components';

export function PostDetail() {
  const t = useT();
  const { postId = '' } = useParams<{ postId: string }>();
  const { openpeepsApi } = useOpenpeeps();

  // Shares the react-query cache with the detail component below, so this does
  // not trigger an extra request.
  const post = openpeepsApi.usePost(postId).data;
  const author = post?.profile ? profileName(post.profile) : undefined;

  const title = author
    ? post?.type === 'event'
      ? t('post.detail.eventTitle', {
          defaultValue: "{{author}}'s event",
          author,
        })
      : t('post.detail.title', {
          defaultValue: "{{author}}'s post",
          author,
        })
    : t('post.detail.fallbackTitle', { defaultValue: 'Post' });

  useSetPageHeader(title);

  return <PostDetailComponent postId={postId} />;
}
