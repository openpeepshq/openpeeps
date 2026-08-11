import { useMemo, useState } from 'react';
import {
  BookmarkMinus,
  BookmarkPlus,
  FlagIcon,
  Pencil,
  Pin,
  Repeat2,
  ThumbsUp,
  Trash,
} from 'lucide-react';
import type { PublicPost } from '@openpeepshq/common/types';
import {
  checkGroupCapabilities,
  checkPostCapabilities,
  checkRoleCapabilities,
} from '@openpeepshq/common/lib';
import {
  PopupMenu,
  PopupMenuButton,
  PopupSeparator,
} from '@openpeepshq/react-ui';
import { useOpenpeeps } from '../../../contexts/openpeeps';
import { useT } from '../../../i18n';
import { useAuthData, useCurrentProfile } from '../../layout/IdentityContext';
import { useCapabilities, useServerInfo } from '../../server-data';
import { ReportProfileOrPostModal } from '../../profile/ReportProfileOrPostModal';
import { DeletePostModal } from './modals/DeletePostModal';
import { ReactionsModal } from './modals/ReactionsModal';
import { RepostModal } from './modals/RepostModal';
import { useEditPostModal } from '../post-form/EditPostModalContext';

export interface PostMenuProps {
  post: PublicPost;
  deleteCallback?: () => void;
}

export function PostMenu({ post, deleteCallback }: PostMenuProps) {
  const t = useT();
  const me = useCurrentProfile();
  const authData = useAuthData();
  const capabilities = useCapabilities();
  const serverInfo = useServerInfo();
  const { openpeepsApi } = useOpenpeeps();
  const { openEditPost } = useEditPostModal();

  const [modal, setModal] = useState<
    'reactions' | 'reposts' | 'delete' | 'reportPost' | 'reportProfile' | null
  >(null);

  const bookmarkedIdsQuery = openpeepsApi.useCurrentProfileBookmarkedIds();
  const followProfile = openpeepsApi.followProfileAction({
    id: post.profile.id,
  });
  const unfollowProfile = openpeepsApi.unfollowProfileAction({
    id: post.profile.id,
  });
  const bookmarkPost = openpeepsApi.bookmarkPostAction({ id: post.id });
  const unbookmarkPost = openpeepsApi.unbookmarkPostAction({ id: post.id });
  const updateGroup = openpeepsApi.updateGroupAction({
    id: post.group?.id ?? '',
  });
  const pinGloballyMutation = openpeepsApi.admin.pinPostGloballyAction();

  const postProfile = post.profile;
  const isFollowing = me?.following?.some((f) => f.id === postProfile.id);
  const isBookmarked = bookmarkedIdsQuery.data?.includes(post.id) ?? false;
  const pinnedGlobally =
    serverInfo.communityConfig?.content?.pinnedPost === post.id;
  const pinnedInGroup = post.group?.pinnedPostId === post.id;

  const canPinToGroup = useMemo(
    () =>
      !!post.group &&
      checkGroupCapabilities(authData, ['core-groups-pin'], post.group).success,
    [authData, post.group],
  );

  const canPinGlobally = useMemo(
    () =>
      ['public', 'local'].includes(post.visibility) &&
      !!me &&
      checkRoleCapabilities(me.roles ?? [], ['core-config-update']).success,
    [me, post.visibility],
  );

  const canDeletePost = useMemo(
    () =>
      checkPostCapabilities(authData, ['core-posts-delete'], post, capabilities)
        .success,
    [authData, post, capabilities],
  );

  const canReportPost = useMemo(
    () =>
      !!me &&
      checkRoleCapabilities(me.roles ?? [], ['core-reports-create']).success,
    [me],
  );

  const isPostOwner = postProfile?.id === me?.id;

  if (!me) return null;

  const handleEditPost = () => {
    if (post.data?.type === 'event') {
      window.location.assign(`/events/${post.id}/edit`);
      return;
    }
    if (post.data?.type === 'article') {
      window.location.assign(`/articles/${post.id}/edit`);
      return;
    }
    openEditPost(post);
  };

  return (
    <>
      <PopupMenu
        className="h-max rounded-lg p-2 hover:opacity-80"
        title={t('posts.menu.title', { defaultValue: 'Post menu' })}
      >
        {postProfile.id !== me.id ? (
          isFollowing ? (
            <PopupMenuButton
              title={t('profile.actions.unfollow', {
                defaultValue: 'Unfollow',
              })}
              text={t('profile.actions.unfollow', { defaultValue: 'Unfollow' })}
              action={() => unfollowProfile(undefined)}
            />
          ) : (
            <PopupMenuButton
              title={t('profile.actions.follow', { defaultValue: 'Follow' })}
              text={t('profile.actions.follow', { defaultValue: 'Follow' })}
              action={() => followProfile({ reblogs: true, notify: true })}
            />
          )
        ) : null}
        <PopupMenuButton
          title={t('posts.menu.reposts', { defaultValue: 'Reposts' })}
          text={t('posts.menu.reposts', { defaultValue: 'Reposts' })}
          icon={Repeat2}
          action={() => setModal('reposts')}
        />
        <PopupMenuButton
          title={t('posts.menu.reactions', { defaultValue: 'Reactions' })}
          text={t('posts.menu.reactions', { defaultValue: 'Reactions' })}
          icon={ThumbsUp}
          action={() => setModal('reactions')}
        />
        {isBookmarked ? (
          <PopupMenuButton
            title={t('posts.unbookmark.title', {
              defaultValue: 'Remove bookmark',
            })}
            text={t('posts.unbookmark.title', {
              defaultValue: 'Remove bookmark',
            })}
            icon={BookmarkMinus}
            action={async () => {
              await unbookmarkPost(undefined);
            }}
          />
        ) : (
          <PopupMenuButton
            title={t('posts.bookmark.title', { defaultValue: 'Bookmark' })}
            text={t('posts.bookmark.title', { defaultValue: 'Bookmark' })}
            icon={BookmarkPlus}
            action={async () => {
              await bookmarkPost(undefined);
            }}
          />
        )}
        {canPinGlobally ? (
          <PopupMenuButton
            title={
              pinnedGlobally
                ? t('posts.unpinGlobally.title', {
                    defaultValue: 'Unpin globally',
                  })
                : t('posts.pinGlobally.title', { defaultValue: 'Pin globally' })
            }
            text={
              pinnedGlobally
                ? t('posts.unpinGlobally.title', {
                    defaultValue: 'Unpin globally',
                  })
                : t('posts.pinGlobally.title', { defaultValue: 'Pin globally' })
            }
            icon={Pin}
            action={() =>
              pinGloballyMutation({ postId: pinnedGlobally ? '' : post.id })
            }
          />
        ) : null}
        {canPinToGroup && post.group ? (
          pinnedInGroup ? (
            <PopupMenuButton
              title={t('posts.unpinInGroup.title', {
                defaultValue: 'Unpin in group',
              })}
              text={t('posts.unpinInGroup.title', {
                defaultValue: 'Unpin in group',
              })}
              icon={Pin}
              action={() => updateGroup({ ...post.group!, pinnedPostId: '' })}
            />
          ) : (
            <PopupMenuButton
              title={t('posts.pinInGroup.title', {
                defaultValue: 'Pin in group',
              })}
              text={t('posts.pinInGroup.title', {
                defaultValue: 'Pin in group',
              })}
              icon={Pin}
              action={() =>
                updateGroup({ ...post.group!, pinnedPostId: post.id })
              }
            />
          )
        ) : null}
        {isPostOwner ? (
          <>
            <PopupSeparator />
            <PopupMenuButton
              title={t('common.actions.edit', { defaultValue: 'Edit' })}
              text={t('common.actions.edit', { defaultValue: 'Edit' })}
              icon={Pencil}
              action={handleEditPost}
            />
          </>
        ) : null}
        {canDeletePost ? (
          <PopupMenuButton
            title={t('common.actions.delete', { defaultValue: 'Delete' })}
            text={t('common.actions.delete', { defaultValue: 'Delete' })}
            icon={Trash}
            danger
            action={() => setModal('delete')}
          />
        ) : null}
        {canReportPost ? (
          <>
            <PopupMenuButton
              title={t('common.actions.reportPost', {
                defaultValue: 'Report post',
              })}
              text={t('common.actions.reportPost', {
                defaultValue: 'Report post',
              })}
              icon={FlagIcon}
              danger
              action={() => setModal('reportPost')}
            />
            <PopupMenuButton
              title={t('common.actions.reportProfile', {
                defaultValue: 'Report @{{handle}}',
                handle: post.profile.handle,
              })}
              text={t('common.actions.reportProfile', {
                defaultValue: 'Report @{{handle}}',
                handle: post.profile.handle,
              })}
              icon={FlagIcon}
              danger
              action={() => setModal('reportProfile')}
            />
          </>
        ) : null}
      </PopupMenu>

      <ReactionsModal
        reactions={post.reactions ?? []}
        open={modal === 'reactions'}
        onClose={() => setModal(null)}
      />
      <RepostModal
        post={post}
        open={modal === 'reposts'}
        onClose={() => setModal(null)}
      />
      <DeletePostModal
        post={post}
        open={modal === 'delete'}
        onClose={() => setModal(null)}
        deleteCallback={deleteCallback}
      />
      <ReportProfileOrPostModal
        reportType="post"
        post={post}
        open={modal === 'reportPost'}
        onClose={() => setModal(null)}
      />
      <ReportProfileOrPostModal
        reportType="profile"
        profile={post.profile}
        open={modal === 'reportProfile'}
        onClose={() => setModal(null)}
      />
    </>
  );
}
