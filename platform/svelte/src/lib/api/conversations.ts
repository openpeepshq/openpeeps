import type { PublicProfile } from '@openpeeps/common/types';
import { client, payloadMutation, simpleStore } from './helpers';

export const conversationsListStore = () => simpleStore(client.conversations.list);
export const conversationStore = (id: string) =>
	simpleStore(client.conversations.findById, { pathParams: { id } });

export const createConversationMutation = payloadMutation(client.posts.create, {
	queryKeys: [['conversations'], ['posts']]
});

export const postToConversationMutation = payloadMutation(client.conversations.newPost, {
	queryKeys: [['conversations'], ['posts']]
});
