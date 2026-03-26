import { CustomEmoji, PostWithMeta, PublicProfile } from '@openpeeps/common/types';
import { Account, Emoji, MediaAttachment, Status } from './typescript';
import { serverRootUrl } from '../server';
import { snakeCase } from 'change-case/keys';

export * from './types';

const profileToAccount = async (profile: PublicProfile): Promise<Account> => {

  return {
    id: profile.id,
    avatar: profile.avatar ?? '',
    bot: !!profile.bot,
    created_at: profile.createdAt,
    header: profile.header ?? '',
    username: profile.handle ?? '',
    avatar_static: profile.avatar ?? '',
    header_static: profile.header ?? '',
    display_name: profile.displayName ?? '',
    discoverable: !!profile.discoverable,
    note: profile.bio ?? '',
    statuses_count: 0,
    following_count: 0,
    followers_count: 0,
    url: `${await serverRootUrl()}/@${profile.handle}`,
    acct: '',
    emojis: [],
    fields: profile.fields ?? [],
    group: false,
    locked: !!profile.locked,
  };
};

export const postToStatus = async (o: PostWithMeta): Promise<Status> => ({
  account: await profileToAccount(o.profile),
  created_at: o.createdAt,
  content: `<p>${o.data?.content ?? ''}</p>`,
  emojis:
    o.data?.customEmojis?.map((e: CustomEmoji) => snakeCase(e, 99) as Emoji) ??
    [],
  favourites_count: 0, // TODO
  id: o.id,
  media_attachments:
    o.data?.attachments?.map(
      (ma: unknown) => snakeCase(ma, 99) as MediaAttachment,
    ) ?? [],
  url: `${await serverRootUrl()}/objects/${o.id}`,
  mentions: [], // TODO,
  reblogs_count: 0, // TODO
  replies_count: 0, // TODO
  sensitive: !!o.data?.sensitive,
  spoiler_text: o.data?.spoilerText ?? '',
  tags: [], // TODO
  uri: `${await serverRootUrl()}/objects/${o.id}`,
  visibility: o.visibility === 'group' || o.visibility === 'report' ? 'private' : o.visibility,
});
