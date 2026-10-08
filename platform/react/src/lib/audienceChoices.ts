import type { TFunction } from 'i18next';
import type {
  AuthorizationData,
  PostType,
  VisibilityType,
} from '@openpeepshq/common';
import {
  canCreatePostTypeInAnyGroup,
  canCreatePostTypeWithVisibility,
} from '@openpeepshq/common/lib';

export interface AudienceChoiceBase {
  title: string;
  description: string;
  value: VisibilityType;
}

export const AUDIENCE_CHOICE_VALUES: VisibilityType[] = [
  'public',
  'local',
  'group',
  'direct',
];

/** Visibility options the current profile may pick for a post type. */
export const buildAudienceChoiceValues = (
  type: PostType,
  authData: AuthorizationData,
  t: TFunction,
  options: { publicContent?: boolean; showDirect?: boolean } = {},
): AudienceChoiceBase[] => {
  const { publicContent = false, showDirect = false } = options;
  const profile = authData.profile;
  const prefix = `visibility.${type === 'event' ? 'event' : 'post'}.`;
  const i = (key: string) => t(`${prefix}${key}`, { defaultValue: key });

  // Events may be public even when the community hides content from visitors.
  const allowPublicWithoutServerSetting = type === 'event';

  return AUDIENCE_CHOICE_VALUES.filter((value) => {
    if (
      value === 'public' &&
      !publicContent &&
      !allowPublicWithoutServerSetting
    ) {
      return false;
    }
    if (value === 'direct' && !showDirect) return false;
    if (value === 'group') {
      return !!profile && canCreatePostTypeInAnyGroup(authData, type);
    }
    return !!profile && canCreatePostTypeWithVisibility(authData, type, value);
  }).map((value) => ({
    title: i(`${value}.title`),
    description: i(`${value}.description`),
    value,
  }));
};

export const audienceSummary = (
  visibility: VisibilityType,
  t: TFunction,
  groupName?: string,
  audienceCount?: number,
) => {
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
};
