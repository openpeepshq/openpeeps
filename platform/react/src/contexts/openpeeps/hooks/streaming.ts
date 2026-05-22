import type { OpenpeepsClient } from '@openpeeps/client';
import type { MediaStream } from '@openpeeps/common';
import { payloadMutation, apiHook } from '../helpers';

export type StreamingHooks = ReturnType<typeof streamingHooks>;

export const streamingHooks = (client: OpenpeepsClient) => ({
  createVodStreamAction: payloadMutation(client.streaming.vod.create),
  useVodStreamStatus: (storageId: string) =>
    apiHook(client.streaming.vod.status, { pathParams: { storageId } }),
  vodMasterPlaylistUrl: (storageId: string, originHint?: string) => {
    const origin =
      originHint ??
      (typeof window !== 'undefined' ? window.location.origin : '');
    return `${origin}/media/streaming/${storageId}/hls.m3u8`;
  },
});

export type VodStreamStatusHook = ReturnType<
  StreamingHooks['useVodStreamStatus']
>;

export type CreateVodStreamAction = (
  input: { url: string },
) => Promise<MediaStream>;
