import { client, payloadMutation } from './helpers';
import type { MediaAttachment, MediaStorageRequestInput } from '@openpeeps/common/types';

export const uploadMediaFileMutation = payloadMutation<MediaStorageRequestInput, MediaAttachment>(
	client.mediaAttachment.create
);
