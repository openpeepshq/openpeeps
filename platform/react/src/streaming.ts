/**
 * Builds the URL to the HLS master playlist for a given storage id. Lives
 * outside the API subtree (`/media/streaming/...`), so callers must supply
 * the origin the source URL was served from rather than the API base URL.
 */
export const vodMasterPlaylistUrl = (
    storageId: string,
    origin: string,
): string =>
    `${origin.replace(/\/$/, '')}/media/streaming/${storageId}/hls.m3u8`;
