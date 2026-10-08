import { groupName, profileName } from '@openpeepshq/common';
import { useOpenpeeps } from '../../contexts/openpeeps';
import { useT } from '../../i18n';

/** Header copy for the post detail page; `group*` are set when the post belongs to a group. */
export const usePostDetailTitle = (postId: string) => {
  const t = useT();
  const { openpeepsApi } = useOpenpeeps();

  // Shares the react-query cache with the detail component, so this does not
  // trigger an extra request.
  const post = openpeepsApi.usePost(postId).data;
  const author = post?.profile ? profileName(post.profile) : undefined;
  const groupHandle = post?.group?.handle;
  const groupLabel = post?.group ? groupName(post.group) : '';

  const kindTitle = !author
    ? t('post.detail.fallbackTitle', { defaultValue: 'Post' })
    : post?.repost
      ? t('post.detail.repostTitle', {
          defaultValue: '{{author}} reposted a post',
          author,
        })
      : post?.type === 'event'
        ? t('post.detail.eventTitle', {
            defaultValue: "{{author}}'s event",
            author,
          })
        : t('post.detail.title', {
            defaultValue: "{{author}}'s post",
            author,
          });

  const inGroup = !!author && !!groupHandle && !!groupLabel;

  return { post, kindTitle, groupHandle, groupLabel, inGroup };
};
