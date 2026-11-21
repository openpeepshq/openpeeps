import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  BookmarkMinus,
  BookmarkPlus,
  FlagIcon,
  History,
  Pencil,
  Pin,
  Repeat2,
  Send,
  ThumbsUp,
  Trash,
} from 'lucide-react';
import type { PublicPost } from '@openpeepshq/common/types';
import {
  canCreatePostTypeIgnoringScopes,
  checkGroupCapabilities,
  checkPostCapabilities,
  checkRoleCapabilities,
  postHasEditHistory,
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
import { PostEditHistoryModal } from './modals/PostEditHistoryModal';
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
    | 'reactions'
    | 'reposts'
    | 'history'
    | 'delete'
    | 'reportPost'
    | 'reportProfile'
    | null
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
  const publishPost = openpeepsApi.publishPostAction({ id: post.id });
  const updateGroup = openpeepsApi.updateGroupAction({
    id: post.group?.id ?? '',
  });
  const pinGloballyMutation = openpeepsApi.admin.pinPostGloballyAction();
  const pinOnProfileMutation = openpeepsApi.pinPostOnProfileAction();

  const postProfile = post.profile;
  const isFollowing = me?.following?.some((f) => f.id === postProfile.id);
  const isBookmarked = bookmarkedIdsQuery.data?.includes(post.id) ?? false;
  const pinnedGlobally =
    serverInfo.communityConfig?.content?.pinnedPost === post.id;
  const pinnedInGroup = post.group?.pinnedPostId === post.id;
  const pinnedOnProfile = me?.pinnedPostId === post.id;

  // Q4: a draft keeps its intended visibility. If the author no longer has
  // permission to create a post at that visibility, publishing is blocked —
  // the menu disables Publish and shows a warning instead. Scopes are checked
  // server-side at publish time, so the UI gate uses the scope-free variant.
  const isDraft = post.isDraft === true;
  const canPublishDraft = isDraft
    ? canCreatePostTypeIgnoringScopes(authData, post.type, [post.visibility])
    : true;

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

  const isPostOwner = postProfile?.id === me?.id;

  // Hidden (blocked-author tombstone) posts have their entry snapshots
  // stripped server-side; never offer history for them or deleted posts.
  const showEditHistory =
    !post.hidden && !post.deletedAt && postHasEditHistory(post.entries);

  const canReportPost = useMemo(
    () =>
      !!me &&
      !isPostOwner &&
      checkRoleCapabilities(me.roles ?? [], ['core-reports-create']).success,
    [me, isPostOwner],
  );

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
    if (post.data?.type === 'resource') {
      window.location.assign(`/resources/${post.id}/edit`);
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
        {showEditHistory ? (
          <PopupMenuButton
            title={t('posts.editHistory.menu', {
              defaultValue: 'Edit history',
            })}
            text={t('posts.editHistory.menu', { defaultValue: 'Edit history' })}
            icon={History}
            action={() => setModal('history')}
          />
        ) : null}
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
              title={
                pinnedOnProfile
                  ? t('posts.unpinOnProfile.title', {
                      defaultValue: 'Unpin from profile',
                    })
                  : t('posts.pinOnProfile.title', {
                      defaultValue: 'Pin to profile',
                    })
              }
              text={
                pinnedOnProfile
                  ? t('posts.unpinOnProfile.title', {
                      defaultValue: 'Unpin from profile',
                    })
                  : t('posts.pinOnProfile.title', {
                      defaultValue: 'Pin to profile',
                    })
              }
              icon={Pin}
              action={() =>
                pinOnProfileMutation({
                  postId: pinnedOnProfile ? '' : post.id,
                })
              }
            />
            <PopupMenuButton
              title={t('common.actions.edit', { defaultValue: 'Edit' })}
              text={t('common.actions.edit', { defaultValue: 'Edit' })}
              icon={Pencil}
              action={handleEditPost}
            />
            {isDraft ? (
              <>
                {!canPublishDraft ? (
                  <div className="flex items-start gap-2 rounded-button p-2 text-sm">
                    <AlertTriangle className="text-error mt-0.5 size-4 shrink-0" />
                    <span className="text-muted-foreground">
                      {t('posts.menu.cannotPublishDraft', {
                        defaultValue:
                          'You no longer have permission to post at this draft’s visibility, so it can’t be published. Change the visibility or ask an admin.',
                      })}
                    </span>
                  </div>
                ) : null}
                <PopupMenuButton
                  title={
                    canPublishDraft
                      ? t('posts.menu.publish', { defaultValue: 'Publish' })
                      : t('posts.menu.publishDisabled', {
                          defaultValue: 'Publish (not allowed)',
                        })
                  }
                  text={t('posts.menu.publish', { defaultValue: 'Publish' })}
                  icon={Send}
                  disabled={!canPublishDraft}
                  action={async () => {
                    if (!canPublishDraft) return;
                    await publishPost(undefined);
                  }}
                />
              </>
            ) : null}
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
      {showEditHistory ? (
        <PostEditHistoryModal
          post={post}
          open={modal === 'history'}
          onClose={() => setModal(null)}
        />
      ) : null}
      <RepostModal
        reposts={post.reposts ?? []}
        repostCount={post.repostCount ?? 0}
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
