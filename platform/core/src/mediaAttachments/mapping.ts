import { MediaAttachment, MediaAttachmentData } from "@openpeeps/common/types";
import { map } from "@openpeeps/arango-querybuilder";

export const mediaAttachmentsMapping = map<MediaAttachmentData, MediaAttachment>({
    collection: 'mediaAttachments',
});