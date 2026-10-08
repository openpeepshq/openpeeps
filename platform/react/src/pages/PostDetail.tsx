import { useMemo, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useT, useSetPageHeader } from '../index';
import { usePostDetailTitle } from '../hooks/posts/usePostDetailTitle';
import { PostDetail as PostDetailComponent } from '../components';

export function PostDetail() {
  const t = useT();
  const { postId = '' } = useParams<{ postId: string }>();
  const { kindTitle, groupHandle, groupLabel, inGroup } =
    usePostDetailTitle(postId);

  const title = useMemo((): ReactNode => {
    if (!inGroup) return kindTitle;

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
  }, [groupHandle, groupLabel, inGroup, kindTitle, t]);

  useSetPageHeader(title);

  return <PostDetailComponent postId={postId} />;
}
