import {
	eventSchema,
	noteSchema,
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
