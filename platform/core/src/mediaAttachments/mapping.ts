import { MediaAttachment, MediaAttachmentData } from '@openpeepshq/common/types';
import { map } from '../db/pg/map';

export const mediaAttachmentsMapping = map<
  MediaAttachmentData,
  MediaAttachment
>({
  collection: 'mediaAttachments',
});
