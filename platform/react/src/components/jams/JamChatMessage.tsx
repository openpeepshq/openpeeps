import { useMemo } from 'react';
import {
  truncateText,
  type JamEvent,
  type PublicProfile,
} from '@openpeepshq/common';
import { useOpenpeeps } from '../../contexts/openpeeps';
import { OpenpeepsMarkdown } from '../markdown/OpenpeepsMarkdown';
import { Avatar } from '../profile/Avatar';
import { UpdatingDate } from '@openpeepshq/react-ui';

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
}

export function JamChatMessage({
  message,
  mentionProfiles = [],
}: JamChatMessageProps) {
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
              mentions={mentions}
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
