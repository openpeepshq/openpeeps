import { allpeepDb } from '../db';
import { mediaAttachmentsMapping } from './mapping';

export const findMediaAttachment = (id: string) =>
  allpeepDb().then((db) => mediaAttachmentsMapping.find(db.db, id));
