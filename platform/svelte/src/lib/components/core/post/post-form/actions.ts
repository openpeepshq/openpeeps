import {
	eventSchema,
	noteSchema,
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
