import { client, simpleStore } from './helpers';

export const linkPreviewQuery = (url: string) =>
	simpleStore(client.previewLink, { pathParams: { url } });
