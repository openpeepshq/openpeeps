import { useMemo } from 'react';
import { Ellipsis } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  UpdatingDate,
} from '@openpeepshq/react-ui';
import {
  truncateText,
  type JamEvent,
  type PublicProfile,
} from '@openpeepshq/common';
import { useOpenpeeps } from '../../contexts/openpeeps';
import { useT } from '../../i18n';
import { OpenpeepsMarkdown } from '../markdown/OpenpeepsMarkdown';
import { Avatar } from '../profile/Avatar';

const attendance = ['join', 'leave', 'start', 'close'] as const;

const attendanceMap = {
  join: 'joined',
  leave: 'left',
  start: 'started',
  close: 'closed',
} as const;

export interface JamChatMessageProps {
  message: JamEvent;
  mentionProfiles?: PublicProfile[];
  /**
   * Set when the viewer may delete this message (host / moderator / author).
   * Renders a three-dot "Delete" menu when present; otherwise the message
   * renders exactly as before.
   */
  onDelete?: () => void;
}

export function JamChatMessage({
  message,
  mentionProfiles = [],
  onDelete,
}: JamChatMessageProps) {
  const t = useT();
  const { openpeepsApi } = useOpenpeeps();
  const profileQuery = openpeepsApi.useProfile(message.profileId || 'unknown');
  const profile = profileQuery.data;
  const mentions = useMemo(() => {
    const items = mentionProfiles.map((item) => ({ profile: item }));
    if (!profile) return items;
    if (items.some((item) => item.profile.id === profile.id)) return items;
    return [{ profile }, ...items];
  }, [mentionProfiles, profile]);

  if (!message.profileId) {
    return null;
  }

  if (profileQuery.isLoading) {
    return null;
  }

  if (!profile) {
    return null;
  }

  if (message.type === 'message') {
    return (
      <div className="flex items-center justify-between">
        <div className="grid w-full grid-cols-5 gap-x-1">
          <div className="col-span-1 flex w-full justify-center">
            <Avatar profile={profile} borderless size={2} />
          </div>
          <div className="col-span-4 w-full">
            <div className="flex w-full items-center gap-x-1">
              <h4 className="hidden md:flex">
                {truncateText(profile.displayName || `@${profile.handle}`, 20)}
              </h4>
              <h4 className="flex md:hidden">
                {truncateText(profile.displayName || `@${profile.handle}`, 10)}
              </h4>
              <p className="text-muted-foreground break-words text-sm">
                <UpdatingDate date={message.createdAt} />
              </p>
            </div>
            <OpenpeepsMarkdown
              source={message.content ?? ''}
              mentions={mentions}
              linkPreviewMode="none"
            />
          </div>
        </div>
        {onDelete ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                title={t('jams.chat.deleteTitle', {
                  defaultValue: 'Delete message',
                })}
                aria-label={t('jams.chat.deleteTitle', {
                  defaultValue: 'Delete message',
                })}
                className="text-muted-foreground hover:text-foreground flex h-7 w-7 shrink-0 items-center justify-center rounded"
              >
                <Ellipsis className="size-4" aria-hidden="true" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="end" className="w-40">
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onSelect={onDelete}
              >
                {t('jams.chat.delete', { defaultValue: 'Delete' })}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
    );
  }

  if (attendance.includes(message.type as (typeof attendance)[number])) {
    const label =
      attendanceMap[message.type as keyof typeof attendanceMap] ?? message.type;
    return (
      <div className="flex items-center justify-center">
        <span className="text-muted-foreground text-center text-sm">
          {profile.displayName || `@${profile.handle}`} {label} the jam{' '}
          <UpdatingDate date={message.createdAt} />
        </span>
      </div>
    );
  }

  if (message.type === 'kicked') {
    return (
      <div className="flex items-center justify-center">
        <span className="text-muted-foreground text-center text-sm">
          {profile.displayName || `@${profile.handle}`}{' '}
          {t('jams.chat.wasRemoved', {
            defaultValue: 'was removed from the jam',
          })}{' '}
          <UpdatingDate date={message.createdAt} />
        </span>
      </div>
    );
  }

  return null;
}
