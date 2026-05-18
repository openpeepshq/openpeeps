import type { MediaStream } from '@openpeeps/common/types';
import { authenticatedCoreApiClient } from './base';
import { client, throwError } from './helpers';

/**
 * Request that an HLS VOD stream be produced for a media URL hosted on this
 * server. Idempotent — calling it for a source that has already been
 * transcoded just returns the existing `MediaStream` and refreshes its
 * access timestamp on the server side.
 */
export const createVodStream = (url: string): Promise<MediaStream> =>
	client.streaming.vod
		.create(
			{ url },
			{
				fetchClient: authenticatedCoreApiClient(),
			},
		)
		.then(throwError<MediaStream>());

/** Polls the current status of a previously-created VOD stream. */
export const getVodStreamStatus = (storageId: string): Promise<MediaStream> =>
	client.streaming.vod
		.status({
			pathParameters: { storageId },
			fetchClient: authenticatedCoreApiClient(),
		})
		.then(throwError<MediaStream>());

/**
 * Builds the URL to the HLS master playlist for a given storage id. Lives
 * outside the API subtree (`/media/streaming/...`), so we construct it from
 * the same origin the source URL came from rather than the API base URL.
 */
export const vodMasterPlaylistUrl = (
	storageId: string,
	originHint?: string,
): string => {
	const origin =
		originHint ??
		(typeof window !== 'undefined' ? window.location.origin : '');
	return `${origin}/media/streaming/${storageId}/hls.m3u8`;
};
