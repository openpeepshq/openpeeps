import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { lightFormat, parse, parseJSON } from 'date-fns';
import {
  GroupData,
  Profile,
  PublicProfile,
  SuccessFailureResponse,
  groupSectionFromHash,
} from '@openpeepshq/common';
import { NativeScrollEvent } from 'react-native';
import { buildGoto } from '../components/navigation/helpers';
import { BASE_URL } from './constants';
import { UseInfiniteQueryResult } from '@tanstack/react-query';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const DATE_FORMAT = 'MM/dd/yyyy';
const TIME_FORMAT = 'hh:mm aaa';
const DATE_TIME_FORMAT = `${DATE_FORMAT} ${TIME_FORMAT}`;

export const maxContentLength = 500;
export const maxArticleContentLength = 10000;

export const formatDateTime = (date: Date) =>
  lightFormat(date, DATE_TIME_FORMAT);
export const formatDate = (date: Date) => lightFormat(date, DATE_FORMAT);
export const formatTime = (date: Date) => lightFormat(date, TIME_FORMAT);

export const reformatDateTime = (dateString: string) =>
  formatDateTime(parseJSON(dateString));
export const parseDateTime = (dateString: string) =>
  parse(dateString, DATE_TIME_FORMAT, Date.now());

export const sortBy =
  (key: string | ((object: any) => string | number)) => (a: any, b: any) =>
    typeof key === 'string'
      ? a[key] > b[key]
        ? 1
        : b[key] > a[key]
          ? -1
          : 0
      : key(a) > key(b)
        ? 1
        : key(b) > key(a)
          ? -1
          : 0;

export const truncateText = (text?: string, maxLength: number = 15) => {
  if (!text) {
    return '';
  }
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
};

export const profileMatchesQuery = (profile: Profile, query: string) => {
  const queryLower = query.toLowerCase();
  return (
    profile?.displayName?.toLowerCase().includes(queryLower) ||
    profile?.handle.toLowerCase().includes(queryLower)
  );
};

export const formatEventDate = (dateString: string) => {
  return new Date(dateString).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

export const ChatDateFormatter = (date: string) => {
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  };

  const today = new Date();
  const messageDate = new Date(date);
  if (
    today.getDate() === messageDate.getDate() &&
    today.getMonth() === messageDate.getMonth() &&
    today.getFullYear() === messageDate.getFullYear()
  ) {
    return 'Today';
  } else if (
    today.getDate() - 1 === messageDate.getDate() &&
    today.getMonth() === messageDate.getMonth() &&
    today.getFullYear() === messageDate.getFullYear()
  ) {
    return 'Yesterday';
  } else {
    return new Date(date).toLocaleDateString(undefined, options);
  }
};

export const profileName = (profile?: PublicProfile) =>
  profile?.displayName || profile?.handle;

export const groupName = (group?: GroupData) =>
  group?.displayName || group?.handle || '';

export const hasValue = (v: unknown): boolean => v === 0 || !!v;

export const handleScroll = (
  event: NativeScrollEvent,
  query: UseInfiniteQueryResult<unknown, SuccessFailureResponse>
) => {
  const { layoutMeasurement, contentOffset, contentSize } = event;
  const isCloseToBottom =
    layoutMeasurement.height + contentOffset.y >= contentSize.height - 20;

  if (isCloseToBottom && query.hasNextPage && !query.isFetchingNextPage) {
    query.fetchNextPage();
  }
};

export const handleInternalURLNavigation = (
  defaultAction: string,
  goto: ReturnType<typeof buildGoto>
) => {
  const navigatePath = (path: string) => {
    const hashStart = path.indexOf('#');
    const hash = hashStart === -1 ? '' : path.slice(hashStart);
    const pathWithoutHash = hashStart === -1 ? path : path.slice(0, hashStart);

    if (isGroupPath(pathWithoutHash)) {
      const pathname = pathWithoutHash.split('?')[0] ?? pathWithoutHash;
      goto({
        target: 'group',
        params: {
          handle: pathname.slice('/groups/@'.length).split('/')[0],
          tab: groupSectionFromHash(hash),
        },
      });
      return true;
    }
    if (isJamPath(pathWithoutHash)) {
      goto({ target: 'event', params: { id: pathWithoutHash.split('/')[2] } });
      return true;
    }
    if (isPostPath(pathWithoutHash)) {
      goto({
        target: 'posts',
        params: { id: pathWithoutHash.split('/')[2] },
      });
      return true;
    }
    if (isProfilePath(pathWithoutHash)) {
      goto({
        target: 'profile',
        params: { handle: pathWithoutHash.slice(2).split('/')[0] },
      });
      return true;
    }
    return false;
  };

  if (defaultAction.startsWith('goto:')) {
    const gotoPath = defaultAction.slice('goto:'.length);
    const path = gotoPath.startsWith('/') ? gotoPath : `/${gotoPath}`;
    if (navigatePath(path)) {
      return;
    }
  }

  if (isLocalLink(defaultAction, BASE_URL as string)) {
    const url = new URL(defaultAction);
    if (navigatePath(`${url.pathname}${url.hash}`)) {
      return;
    }
  }

  const actionList = defaultAction.replace('goto:/', '').split('/');

  if (actionList[0].startsWith('@')) {
    goto({
      target: 'profile',
      params: { handle: actionList[0].replace('@', '') },
    });
    return;
  }

  if (actionList[0].startsWith('#')) {
    goto({
      target: 'HashtagPosts',
      params: { tag: actionList[0].replace('#', '') },
    });
    return;
  }

  if (actionList[0] === 'events' && actionList[2] === 'jam') {
    goto({ target: 'JamSession', params: { jamId: actionList[1] } });
    return;
  }

  goto({ target: actionList[0], params: { id: actionList[1] } });
};

export const isProfilePath = (path: string) => path.startsWith('/@');
export const isGroupPath = (path: string) => path.startsWith('/groups/@');
export const isJamPath = (path: string) =>
  path.startsWith('/events/') && path.endsWith('/jam');
export const isPostPath = (path: string) =>
  path.startsWith('/posts/') && path.substring(7);

export const isLocalLink = (url: string, origin: string) => {
  try {
    const urlObj = new URL(url);
    return (
      urlObj.origin === origin &&
      (isPostPath(urlObj.pathname) ||
        isJamPath(urlObj.pathname) ||
        isGroupPath(urlObj.pathname))
    );
  } catch {
    return false;
  }
};

export const isValidUrl = (url?: string) => {
  if (!url) {
    return false;
  }
  try {
    // eslint-disable-next-line no-new
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

export {
  calculateEffectiveRsvps,
  countYesRsvps,
  canManageEventRsvps,
  displayRsvpForProfile,
  isCapacityEvent,
  recurringEventHasOpenOccurrence,
} from '@openpeepshq/common/lib';
