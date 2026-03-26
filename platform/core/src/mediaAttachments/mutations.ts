import { MediaAttachmentData } from "@openpeeps/common/types";
import { mediaAttachmentsMapping } from "./mapping";
import { allpeepDb } from "../db";

export const createMediaAttachment = async (data: MediaAttachmentData) => {
    const db = await allpeepDb().then(db => db.db);
    return mediaAttachmentsMapping.create(db, data);
}

export const updateMediaAttachment = async (mediaAttachmentId: string, data: Partial<MediaAttachmentData>) => {
    const db = await allpeepDb().then(db => db.db);
    return mediaAttachmentsMapping.update(db, mediaAttachmentId, data);
}