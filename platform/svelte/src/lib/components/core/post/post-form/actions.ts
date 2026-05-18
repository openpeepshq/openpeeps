import {
	eventSchema,
	noteSchema,
	type MediaAttachment,
	type MediaAttachmentData,
	type PostDataUnion,
	type PostType,
	questionSchema
} from '@openpeeps/common/types';
import { defaultPostData } from '$lib/components/core/post/post-form/stores';
import type { ZodType } from 'zod';

const postDataSchemas: Record<PostType, ZodType<PostDataUnion>> = {
	note: noteSchema,
	question: questionSchema,
	event: eventSchema
};

export const switchPostType = (previousData: PostDataUnion, type: PostType) =>
	postDataSchemas[type].parse({
		...defaultPostData(type),
		...previousData,
		type
	});

const isFailedAttachment = (a: MediaAttachmentData) => a.status === 'failed';

const attachmentId = (a: MediaAttachmentData) => (a as MediaAttachment).id;

/** Byte transfer still in flight for this placeholder/real id. */
export const isAttachmentUploading = (
	attachment: MediaAttachmentData,
	activeUploads: ReadonlyMap<string, unknown>,
) => {
	const id = attachmentId(attachment);
	return !!id && activeUploads.has(id);
};

/** Server-side processing still running (upload finished). */
export const isAttachmentProcessing = (attachment: MediaAttachmentData) =>
	attachment.status === 'processing';

export const isAttachmentPending = (
	attachment: MediaAttachmentData,
	activeUploads: ReadonlyMap<string, unknown>,
) =>
	isAttachmentUploading(attachment, activeUploads) ||
	isAttachmentProcessing(attachment);

export const hasPendingAttachments = (
	attachments: ReadonlyArray<MediaAttachmentData> | undefined,
	activeUploads: ReadonlyMap<string, unknown>,
) => (attachments ?? []).some((a) => isAttachmentPending(a, activeUploads));

export const isAttachmentReady = (
	attachment: MediaAttachmentData,
	activeUploads: ReadonlyMap<string, unknown>,
) => !isAttachmentPending(attachment, activeUploads) && !isFailedAttachment(attachment);

export const hasReadyAttachment = (
	attachments: ReadonlyArray<MediaAttachmentData> | undefined,
	activeUploads: ReadonlyMap<string, unknown>,
) => (attachments ?? []).some((a) => isAttachmentReady(a, activeUploads));

/** Note posts: non-empty content (≤500 chars) and/or at least one ready attachment. */
export const isNoteSubmittable = (
	data: PostDataUnion,
	activeUploads: ReadonlyMap<string, unknown>,
) => {
	if (data.type !== 'note') return false;
	if (hasPendingAttachments(data.attachments, activeUploads)) return false;
	const content = data.content?.trim();
	const hasValidContent = !!content && content.length <= 500;
	return hasValidContent || hasReadyAttachment(data.attachments, activeUploads);
};

/**
 * Whether a post form can be submitted. Blocks while any attachment is
 * uploading or processing; for notes, also requires content or a ready file.
 */
export const isPostFormSubmittable = (
	postType: PostType,
	data: PostDataUnion,
	formValid: boolean,
	activeUploads: ReadonlyMap<string, unknown>,
) => {
	const attachments = 'attachments' in data ? data.attachments : undefined;
	if (hasPendingAttachments(attachments, activeUploads)) return false;
	if (postType === 'note') return isNoteSubmittable(data, activeUploads);
	return formValid;
};

/**
 * Strip attachments whose upload/processing has failed before submitting a
 * post — the user gets to keep the placeholder visible (with the big remove
 * affordance) up until they hit submit, but we never send a half-baked entry
 * to the server.
 */
export const stripFailedAttachments = <T extends PostDataUnion>(data: T): T => {
	if ('attachments' in data && Array.isArray(data.attachments)) {
		const filtered = data.attachments.filter((a) => !isFailedAttachment(a));
		if (filtered.length === data.attachments.length) return data;
		return { ...data, attachments: filtered } as T;
	}
	return data;
};
