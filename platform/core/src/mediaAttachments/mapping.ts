import { MediaAttachment, MediaAttachmentData } from '@openpeeps/common/types';
import { map } from '../db/pg/map';

export const mediaAttachmentsMapping = map<
  MediaAttachmentData,
  MediaAttachment
>({
  collection: 'mediaAttachments',
});
