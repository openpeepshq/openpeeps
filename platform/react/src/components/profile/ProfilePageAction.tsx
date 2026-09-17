import { useState } from 'react';
import { Ban, Copy, Flag, MessageSquareText } from 'lucide-react';
import type { PublicProfile } from '@openpeepshq/common/types';
import { canCreatePost } from '@openpeepshq/common/lib';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogHeader,
  DialogTitle,
  PopupMenu,
  PopupMenuButton,
} from '@openpeepshq/react-ui';
import { useT } from '../../i18n';
import { useAuthData, useCurrentProfile } from '../layout/IdentityContext';
import { useCreateNewConversation } from '../conversations/CreateNewConversationContext';
import { useOpenpeeps } from '../../contexts/openpeeps';
import { FollowUnfollowButton } from './FollowUnfollowButton';
import { ReportProfileOrPostModal } from './ReportProfileOrPostModal';

export interface ProfilePageActionProps {
  profile: PublicProfile;
  isCurrentProfile?: boolean;
}

export function ProfilePageAction({
  profile,
  isCurrentProfile = false,
}: ProfilePageActionProps) {
  const t = useT();
  const me = useCurrentProfile();
  const authData = useAuthData();
  const { openpeepsApi } = useOpenpeeps();
  const { openCreateConversation } = useCreateNewConversation();
  const [reportOpen, setReportOpen] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);
  const [blocking, setBlocking] = useState(false);
  const profileQuery = openpeepsApi.useProfileByHandle(profile.handle);
  const currentQuery = openpeepsApi.useCurrentProfile();
  const blockProfile = openpeepsApi.blockProfileAction({ id: profile.id });
  const unblockProfile = openpeepsApi.unblockProfileAction({ id: profile.id });

  const refresh = () => {
    void profileQuery.refetch();
    void currentQuery.refetch();
  };

  const confirmBlock = async () => {
    setBlocking(true);
    try {
      await blockProfile(undefined);
      setBlockOpen(false);
      refresh();
    } finally {
      setBlocking(false);
    }
  };

  const unblock = async () => {
    await unblockProfile(undefined);
    refresh();
  };

  if (profile.blockedByMe) {
    return (
      <div className="mt-2 flex h-6 items-center justify-end gap-x-2 pr-2 pt-3">
        <Button variant="outline" action={unblock}>
          {t('profile.block.unblock', { defaultValue: 'Unblock' })}
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="mt-2 flex h-6 items-center justify-end gap-x-2 pr-2 pt-3">
        {isCurrentProfile ? (
          <Button variant="outline" action="/settings/public-profile">
            {t('profile.edit.title', { defaultValue: 'Edit profile' })}
          </Button>
        ) : me ? (
          <>
            <PopupMenu
              menuButton={
                <span className="text-muted-foreground px-2 text-sm">⋯</span>
              }
              title={t('profile.actions.menu', {
                defaultValue: 'Profile actions',
              })}
            >
              <PopupMenuButton
                title={t('profile.actions.copyProfileLink', {
                  defaultValue: 'Copy profile link',
                })}
                text={t('profile.actions.copyProfileLink', {
                  defaultValue: 'Copy profile link',
                })}
                icon={Copy}
                action={() =>
                  void navigator.clipboard.writeText(window.location.href)
                }
              />
              <PopupMenuButton
                title={t('common.actions.blockProfile', {
                  defaultValue: 'Block @{{handle}}',
                  handle: profile.handle,
                })}
                text={t('common.actions.blockProfile', {
                  defaultValue: 'Block @{{handle}}',
                  handle: profile.handle,
                })}
                icon={Ban}
                action={() => setBlockOpen(true)}
                danger
              />
              <PopupMenuButton
                title={t('common.actions.reportProfile', {
                  defaultValue: 'Report @{{handle}}',
                  handle: profile.handle,
                })}
                text={t('common.actions.reportProfile', {
                  defaultValue: 'Report @{{handle}}',
                  handle: profile.handle,
                })}
                icon={Flag}
                action={() => setReportOpen(true)}
                danger
              />
            </PopupMenu>

            {canCreatePost(authData, 'note', 'direct') ? (
              <Button
                variant="outline"
                title={t('conversations.newMessage', {
                  defaultValue: 'New message',
                })}
                action={() =>
                  openCreateConversation({
                    profiles: [profile],
                    skipProfileSelection: true,
                  })
                }
              >
                <MessageSquareText className="size-5" />
              </Button>
            ) : null}

            <FollowUnfollowButton
              profile={profile}
              onSuccess={() => void profileQuery.refetch()}
            />
          </>
        ) : null}
      </div>

      {me ? (
        <ReportProfileOrPostModal
          reportType="profile"
          profile={profile}
          open={reportOpen}
          onClose={() => setReportOpen(false)}
        />
      ) : null}

      <Dialog open={blockOpen} onOpenChange={setBlockOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t('profile.block.title', {
                defaultValue: 'Block @{{handle}}',
                handle: profile.handle,
              })}
            </DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm">
            {t('profile.block.description', {
              defaultValue:
                'Are you sure you want to block @{{handle}}? You will no longer see each other or each other’s posts.',
              handle: profile.handle,
            })}
          </p>
          <DialogActions
            cancelLabel={t('common.cancel', { defaultValue: 'Cancel' })}
            onCancel={() => setBlockOpen(false)}
            actionLabel={t('profile.block.confirm', { defaultValue: 'Block' })}
            onAction={() => void confirmBlock()}
            disabled={blocking}
            actionVariant="destructive"
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
