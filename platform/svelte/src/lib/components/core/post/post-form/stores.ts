import { writable } from 'svelte/store';
import { persisted } from 'svelte-persisted-store';
import type { PostDataUnion, PostType, PostCreationData, PublicPost } from '@openpeeps/common/types';
import { addHours } from 'date-fns';

export const defaultPostData = (type: PostType): PostDataUnion => {
	switch (type) {
		case 'note':
			return {
				type: 'note',
				content: ''
			};
		case 'question':
			return {
				type: 'question',
				content: '',
				options: [
					{ type: 'note', content: '' },
					{ type: 'note', content: '' }
				],
				expiresAt: addHours(new Date(), 24).toISOString()
			};
		case 'event':
			return {
				type: 'event',
				content: '',
				start: new Date().toISOString(),
				wholeDay: false
			};
		case 'article':
			return {
				type: 'article',
				content: '',
			};
	}
};

const postDataDefaults = (inReplyToId?: string): PostCreationData => ({
	type: "note",
	visibility: 'public',
	data: defaultPostData('note'),
	inReplyToId
});

export const postDataStore = persisted<PostCreationData>('new-post-data', postDataDefaults(), {
	syncTabs: true,
	beforeWrite: (v) => {
		return v;
	}
});

export const resetNewPostData = (): void => postDataStore.set(postDataDefaults());

export const replyDataStore = (inReplyToId: string) =>
	persisted<PostCreationData>(`reply-data-${inReplyToId}`, postDataDefaults(inReplyToId), {
		syncTabs: true
	});
export const resetReplyData = (inReplyToId: string) =>
	replyDataStore(inReplyToId).set(postDataDefaults(inReplyToId));

export const updatePostStore = writable<PublicPost | undefined>(undefined)