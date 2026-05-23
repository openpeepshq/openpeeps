import { useState } from 'react';
import { Copy, Flag, MessageSquareText } from 'lucide-react';
import type { PublicProfile } from '@openpeeps/common/types';
import { canCreatePost } from '@openpeeps/common/lib';
import {
  Button,
  PopupMenu,
  PopupMenuButton,
} from '@openpeeps/react-ui';
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

  if (isCurrentProfile) {
    return (
      <div className="mt-2 flex h-6 items-center justify-end gap-x-2 pr-2 pt-3">
        <Button
          variant="variant-ringed-surface"
          action="/settings/public-profile"
        >
          {t('profile.edit.title', { defaultValue: 'Edit profile' })}
        </Button>
      </div>
    );
  }

  if (!me) return null;

  return (
    <>
      <div className="mt-2 flex h-6 items-center justify-end gap-x-2 pr-2 pt-3">
        <PopupMenu
          menuButton={
            <span className="text-muted-foreground px-2 text-sm">⋯</span>
          }
          title={t('profile.actions.menu', { defaultValue: 'Profile actions' })}
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
            variant="variant-ringed-surface"
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
      </div>

      <ReportProfileOrPostModal
        reportType="profile"
        profile={profile}
        open={reportOpen}
        onClose={() => setReportOpen(false)}
      />
    </>
  );
}
