import {
  Profile,
  PostWithMeta,
  GroupWithMeta,
  ProfileWithMeta,
} from '@openpeeps/common/types';
import {
  isDirect,
  isPublic,
  isUnlisted,
  isPrivate,
  isGroup,
  isLocal,
} from '../posts/helpers';
import { audience } from '../posts';
import {
  checkGroupCapabilities,
  checkRoleCapabilities,
} from '@openpeeps/common/lib';

export * from './tokens';


export const canUpdatePost =
  (profile?: Profile) =>
    async (post: PostWithMeta): Promise<boolean> => {
      if (!profile) {
        return false;
      }

      if (post.type === 'question' && post.entries.filter(e => e.type === 'answer').length) {
        return false;
      }

      return profile.id === post.profile.id;
    };


export const canModerateJam =
  (profile?: ProfileWithMeta) =>
    async (event: PostWithMeta): Promise<boolean> =>
      !!(
        event.data?.type === 'event' &&
        profile?.id &&
        event.data?.jam?.moderators?.includes(profile.id)
      );

export const canReadMessage = (post: PostWithMeta, profile: Profile): boolean =>
  !!(post?.audience &&
    (post?.audience.some((p) => p.id === profile.id) ||
      post?.profile.id === profile.id));