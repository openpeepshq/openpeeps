import { writable, type Readable, readonly } from 'svelte/store';
import { authenticatedCoreApiClient } from './base';
import { client, noPayloadStream, payloadMutation, throwError } from './helpers';
import type {
	MediaAttachment,
	MediaProgressEvent,
	MediaStorageRequestInput,
} from '@openpeeps/common/types';

export const uploadMediaFileMutation = payloadMutation<MediaStorageRequestInput, MediaAttachment>(
	client.mediaAttachment.create
);

export interface MediaUploadHandle {
	uploadPercent: Readable<number>;
	uploadEstimatedRemainingMs: Readable<number | undefined>;
	attachment: Readable<MediaAttachment | undefined>;
	error: Readable<unknown>;
	abort: () => void;
	promise: Promise<MediaAttachment>;
}

export const uploadMediaWithProgress = (
	input: MediaStorageRequestInput,
): MediaUploadHandle => {
	const uploadPercent = writable(0);
	const uploadEstimatedRemainingMs = writable<number | undefined>(undefined);
	const attachment = writable<MediaAttachment | undefined>(undefined);
	const errorStore = writable<unknown>(undefined);
	const controller = new AbortController();

	const promise = client.mediaAttachment
		.createWithProgress(input, {
			fetchClient: authenticatedCoreApiClient(),
			signal: controller.signal,
			onUploadProgress: ({ percent, estimatedRemainingMs }) => {
				uploadPercent.set(percent);
				uploadEstimatedRemainingMs.set(estimatedRemainingMs);
			},
		})
		.then(throwError<MediaAttachment>())
		.then((data) => {
			attachment.set(data);
			return data;
		})
		.catch((e) => {
			errorStore.set(e);
			throw e;
		});

	return {
		uploadPercent: readonly(uploadPercent),
		uploadEstimatedRemainingMs: readonly(uploadEstimatedRemainingMs),
		attachment: readonly(attachment),
		error: readonly(errorStore),
		abort: () => controller.abort(),
		promise,
	};
};

export const mediaProcessingProgress = (id: string) =>
	noPayloadStream<MediaProgressEvent, { id: string }>(
		client.mediaAttachment.progress.listen,
	).last({
		pathParameters: { id },
	});
