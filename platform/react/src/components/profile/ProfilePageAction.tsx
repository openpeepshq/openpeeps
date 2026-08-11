import { useState } from 'react';
import { Copy, Flag, MessageSquareText } from 'lucide-react';
import type { PublicProfile } from '@openpeepshq/common/types';
import { canCreatePost } from '@openpeepshq/common/lib';
import { Button, PopupMenu, PopupMenuButton } from '@openpeepshq/react-ui';
import { useT } from '../../i18n';
import { useAuthData, useCurrentProfile } from '../layout/IdentityContext';
import { useCreateNewConversation } from '../conversations/CreateNewConversationContext';
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
  const { openCreateConversation } = useCreateNewConversation();
  const [reportOpen, setReportOpen] = useState(false);

  return (
    <>
      {/* The row is always rendered (even when empty) so its height reserves
          space below the banner and keeps the overhanging avatar from
          covering the profile name (mirrors the Svelte layout). */}
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

            <FollowUnfollowButton profile={profile} />
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
    </>
  );
}
