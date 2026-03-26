import { client, noPayloadMutation } from '../helpers';

export const announcePostMutation = noPayloadMutation(client.admin.posts.announce, {
	method: 'post'
});
