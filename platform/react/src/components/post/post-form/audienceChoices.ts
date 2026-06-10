import type { TFunction } from 'i18next';
import {
  Globe,
  UserCheck,
  Users,
  WashingMachine,
  type LucideIcon,
} from 'lucide-react';
import type {
  AuthorizationData,
  PostType,
  VisibilityType,
} from '@openpeeps/common';
import {
  canCreatePostTypeInAnyGroup,
  canCreatePostTypeWithVisibility,
} from '@openpeeps/common/lib';

export interface AudienceChoice {
  title: string;
  description: string;
  value: VisibilityType;
  icon: LucideIcon;
}

export function buildAudienceChoices(
  type: PostType,
  authData: AuthorizationData,
  t: TFunction,
  options: {
    publicContent?: boolean;
    showDirect?: boolean;
  } = {},
): AudienceChoice[] {
  const { publicContent = false, showDirect = false } = options;
  const profile = authData.profile;
  const prefix = `visibility.${type === 'event' ? 'event' : 'post'}.`;
  const i = (key: string) =>
    t(`${prefix}${key}`, { defaultValue: key });

  const allChoices: AudienceChoice[] = [
    {
      title: i('public.title'),
      description: i('public.description'),
      value: 'public',
      icon: Globe,
    },
    {
      title: i('local.title'),
      description: i('local.description'),
      value: 'local',
      icon: WashingMachine,
    },
    {
      title: i('group.title'),
      description: i('group.description'),
      value: 'group',
      icon: Users,
    },
    {
      title: i('direct.title'),
      description: i('direct.description'),
      value: 'direct',
      icon: UserCheck,
    },
  ];

  const allowPublicWithoutServerSetting = type === 'event';

  return allChoices.filter((choice) => {
    if (
      choice.value === 'public' &&
      !publicContent &&
      !allowPublicWithoutServerSetting
    ) {
      return false;
    }
    if (choice.value === 'direct' && !showDirect) return false;
    if (choice.value === 'group') {
      return (
        !!profile && canCreatePostTypeInAnyGroup(authData, type)
      );
    }
    return (
      !!profile &&
      canCreatePostTypeWithVisibility(authData, type, choice.value)
    );
  });
}

export function audienceSummary(
  visibility: VisibilityType,
  t: TFunction,
  groupName?: string,
  audienceCount?: number,
) {
  if (visibility === 'group' && groupName) {
    return t('posts.form.audienceGroup', {
      defaultValue: 'Group · {{name}}',
      name: groupName,
    });
  }
  if (visibility === 'direct' && audienceCount) {
    return t('posts.form.audienceDirect', {
      defaultValue: '{{count}} recipients',
      count: audienceCount,
    });
  }
  return t(`visibility.post.${visibility}.title`, {
    defaultValue: visibility,
  });
}
