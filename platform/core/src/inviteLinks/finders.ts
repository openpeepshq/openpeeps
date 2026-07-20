import { allpeepDb } from '../db';
import { inviteLinksMapping } from './mapping';

export const findInviteLink = (id: string) =>
  allpeepDb().then((db) => inviteLinksMapping.find(db.db, id));

export const findInviteLinkBySlug = (slug: string) =>
  allpeepDb().then((db) =>
    inviteLinksMapping.findOneBy(db.db, { matches: { slug } }),
  );

export const listInviteLinks = () =>
  allpeepDb().then((db) => inviteLinksMapping.all(db.db));
