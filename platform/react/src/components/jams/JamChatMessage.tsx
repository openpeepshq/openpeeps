import { truncateText, type JamEvent } from '@openpeeps/common';
import { useOpenpeeps } from '../../contexts/openpeeps';
import { OpenpeepsMarkdown } from '../markdown/OpenpeepsMarkdown';
import { Avatar } from '../profile/Avatar';
import { UpdatingDate } from '@openpeeps/react-ui';

const attendance = ['join', 'leave', 'start', 'close'] as const;

const attendanceMap = {
  join: 'joined',
  leave: 'left',
  start: 'started',
  close: 'closed',
} as const;

export interface JamChatMessageProps {
  message: JamEvent;
}

export function JamChatMessage({ message }: JamChatMessageProps) {
  const { openpeepsApi } = useOpenpeeps();
  const profileQuery = openpeepsApi.useProfile(message.profileId || 'unknown');
  const profile = profileQuery.data;

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
            <div className="flex w-full gap-x-1">
              <h4 className="hidden md:flex">
                {truncateText(profile.displayName || `@${profile.handle}`, 20)}
              </h4>
              <h4 className="flex md:hidden">
                {truncateText(profile.displayName || `@${profile.handle}`, 10)}
              </h4>
              <p className="break-words text-sm text-neutral-500">
                <UpdatingDate date={message.createdAt} />
              </p>
            </div>
            <OpenpeepsMarkdown
              source={message.content ?? ''}
              linkPreviewMode="none"
            />
          </div>
        </div>
      </div>
    );
  }

  if (attendance.includes(message.type as (typeof attendance)[number])) {
    const label =
      attendanceMap[message.type as keyof typeof attendanceMap] ?? message.type;
    return (
      <div className="flex items-center justify-center">
        <span className="text-center text-sm text-neutral-500">
          {profile.displayName || `@${profile.handle}`} {label} the jam{' '}
          <UpdatingDate date={message.createdAt} />
        </span>
      </div>
    );
  }

  return null;
}
