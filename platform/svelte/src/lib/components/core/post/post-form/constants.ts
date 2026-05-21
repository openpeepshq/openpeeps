import { Globe, UserCheck, Users, WashingMachine } from 'lucide-svelte';
import type { VisibilityType, ProfileWithMeta, PostType } from '@openpeeps/common/types';
import type { IconType } from '@openpeeps/ui';
import { i18nContext } from '$lib/components/i18n';
import { getServerInfo } from '$lib/server';
import { getCurrentAuthData } from '$lib/auth';
import { canCreatePostTypeInAnyGroup, canCreatePostTypeWithVisibility } from '@openpeeps/common';

export const buildAudienceChoices: (
  type: PostType,
  currentProfile?: ProfileWithMeta | null,
  options?: { showDirect?: boolean },
) => {
  title: string;
  description: string;
  value: VisibilityType;
  icon: { ref: IconType };
}[] = (type, currentProfile, options = {}) => {
  const { t } = i18nContext();
  const { publicContent } = getServerInfo();
  const { showDirect = false } = options;

  const prefix = `visibility.${type === 'event' ? 'event' : 'post'}.`;
  const i = (key: string) => t(`${prefix}${key}`);

  const allChoices = [
    {
      title: i('public.title'),
      description: i('public.description'),
      value: 'public' as VisibilityType,
      icon: { ref: Globe },
    },
    {
      title: i('local.title'),
      description: i('local.description'),
      value: 'local' as VisibilityType,
      icon: { ref: WashingMachine },
    },
    {
      title: i('group.title'),
      description: i('group.description'),
      value: 'group' as VisibilityType,
      icon: { ref: Users },
    },
    {
      title: i('direct.title'),
      description: i('direct.description'),
      value: 'direct' as VisibilityType,
      icon: { ref: UserCheck },
    },
  ];

  const allowPublicWithoutServerSetting = type === 'event';
  const authData = getCurrentAuthData();
  return allChoices.filter((choice) => {
    if (choice.value === 'public' && !publicContent && !allowPublicWithoutServerSetting) {
      return false;
    }

    if (choice.value === 'direct' && !showDirect) {
      return false;
    }

    if (choice.value === 'group') {
      return (
        currentProfile &&
        canCreatePostTypeInAnyGroup(authData, type)
      );
    }

    return (
      currentProfile &&
      canCreatePostTypeWithVisibility(authData, type, choice.value)
    );
  });
};
