import { MediaAttachmentData } from '@openpeeps/common/types';
import { config } from '../config';

export * from './mutations';
export * from './finders';
export * from './mapping';

const setUrlToCurrentHost = async (url: string): Promise<string> => {
  const parsedUrl = new URL(url);
  parsedUrl.host = (await config()).server.host;
  return parsedUrl.toString();
};

export const convertUrls = async (
  data: MediaAttachmentData,
): Promise<MediaAttachmentData> => ({
  ...data,
  url: await setUrlToCurrentHost(data.url),
  previewUrl: data.previewUrl
    ? await setUrlToCurrentHost(data.previewUrl)
    : null,
});
