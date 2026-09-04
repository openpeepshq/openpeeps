import { useMemo, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { groupName, profileName } from '@openpeepshq/common';
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
  const groupHandle = post?.group?.handle;
  const groupLabel = post?.group ? groupName(post.group) : '';
  const isEvent = post?.type === 'event';

  const title = useMemo((): ReactNode => {
    if (!author) {
      return t('post.detail.fallbackTitle', { defaultValue: 'Post' });
    }

    const kindTitle = isEvent
      ? t('post.detail.eventTitle', {
          defaultValue: "{{author}}'s event",
          author,
        })
      : t('post.detail.title', {
          defaultValue: "{{author}}'s post",
          author,
        });

    if (!groupHandle || !groupLabel) return kindTitle;

    return (
      <h1 className="flex min-w-0 items-baseline gap-x-1 text-xl font-semibold">
        <span className="truncate">{kindTitle}</span>
        <span className="shrink-0">
          {t('post.detail.inGroup', { defaultValue: 'in' })}
        </span>
        <Link
          to={`/groups/@${groupHandle}`}
          className="text-primary min-w-0 truncate hover:underline"
        >
          {groupLabel}
        </Link>
      </h1>
    );
  }, [author, groupHandle, groupLabel, isEvent, t]);

  useSetPageHeader(title);

  return <PostDetailComponent postId={postId} />;
}
