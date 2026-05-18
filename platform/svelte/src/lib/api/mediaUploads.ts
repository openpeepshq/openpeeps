import { get, writable, type Readable, type Writable } from 'svelte/store';
import type { MediaAttachment, MediaStorageRequestInput } from '@openpeeps/common/types';
import { uploadMediaWithProgress, type MediaUploadHandle } from './media';

/**
 * In-flight upload entry for a given (placeholder) attachment id. Consumed by
 * UI components that render the byte-transfer progress overlay on top of an
 * attachment thumbnail, while the SSE-based processing progress is handled
 * separately via `mediaProcessingProgress(realId)`.
 */
export interface ActiveMediaUpload {
	uploadPercent: Readable<number>;
	/**
	 * Linear extrapolation of the remaining upload time (in ms) based on the
	 * elapsed time and bytes-transferred so far. `undefined` until the rate
	 * estimate becomes meaningful (≥250ms in, ≥1% loaded).
	 */
	uploadEstimatedRemainingMs: Readable<number | undefined>;
	abort: () => void;
}

/**
 * Module-singleton registry of in-flight uploads, keyed by the placeholder
 * `attachment.id`. Filled by `startTrackedUpload`, consumed by attachment
 * list components.
 */
export const activeMediaUploads: Writable<Map<string, ActiveMediaUpload>> =
	writable(new Map());

const setActiveUpload = (id: string, entry: ActiveMediaUpload) =>
	activeMediaUploads.update((map) => {
		const next = new Map(map);
		next.set(id, entry);
		return next;
	});

const clearActiveUpload = (id: string) =>
	activeMediaUploads.update((map) => {
		if (!map.has(id)) return map;
		const next = new Map(map);
		next.delete(id);
		return next;
	});

export interface TrackedUploadCallbacks {
	/** Called once with the server's response (partial or fully ready). */
	onResolved?: (attachment: MediaAttachment) => void;
	/** Called on a non-abort failure with an error message. */
	onFailed?: (error: string) => void;
}

export interface TrackedUpload {
	/** The placeholder id used while uploading (matches `placeholder.id`). */
	placeholderId: string;
	/** Cancel the in-flight upload. Has no effect once finished. */
	abort: () => void;
	/** Underlying handle, in case callers want direct access. */
	handle: MediaUploadHandle;
}

/**
 * Start an upload that is mirrored into {@link activeMediaUploads} so the
 * attachment list can render byte-level progress next to the placeholder.
 * The callbacks are invoked exactly once each; the registry entry is cleared
 * when the server responds (or the upload aborts/fails).
 */
export const startTrackedUpload = (
	placeholderId: string,
	input: MediaStorageRequestInput,
	{ onResolved, onFailed }: TrackedUploadCallbacks = {},
): TrackedUpload => {
	const handle = uploadMediaWithProgress(input);

	setActiveUpload(placeholderId, {
		uploadPercent: handle.uploadPercent,
		uploadEstimatedRemainingMs: handle.uploadEstimatedRemainingMs,
		abort: handle.abort,
	});

	const unsubscribeAttachment = handle.attachment.subscribe((a) => {
		if (a) {
			onResolved?.(a);
		}
	});

	handle.promise
		.catch((e) => {
			if (e instanceof Error && e.name === 'AbortError') return;
			onFailed?.(e instanceof Error ? e.message : String(e));
		})
		.finally(() => {
			unsubscribeAttachment();
			clearActiveUpload(placeholderId);
		});

	return {
		placeholderId,
		abort: handle.abort,
		handle,
	};
};

/**
 * Abort every in-flight upload whose placeholder id matches an entry in the
 * given attachment list. Intended for component unmount paths — e.g. a post
 * modal being dismissed while a large upload is still streaming — where we
 * want to surrender the network slot rather than let the request linger.
 *
 * Looks up entries via a one-shot snapshot of {@link activeMediaUploads} so
 * the caller doesn't need to subscribe; aborting an entry is idempotent and
 * a no-op if the upload has already finished or was never registered.
 */
export const abortUploadsForAttachments = (
	attachments:
		| ReadonlyArray<{ id?: string | null } | null | undefined>
		| undefined
		| null,
) => {
	if (!attachments?.length) return;
	const snapshot = get(activeMediaUploads);
	for (const attachment of attachments) {
		const id = attachment?.id;
		if (!id) continue;
		snapshot.get(id)?.abort();
	}
};
