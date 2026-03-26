import {
  ClientConfigSource,
  DefaultHttpClient,
  FetchClient,
  httpVerbs,
  Method,
  Request,
} from '../types';
import { resolveConfig } from '../utils';

const jsonHeaders = {
  Accept: 'application/json',
  'Content-Type': 'application/json',
};

export const fetchClient = (
  configSource: ClientConfigSource = {},
): FetchClient => {
  const request =
    (verb?: string): Method =>
      async (url: string, request: Request = {}) => {
        const config = await resolveConfig(configSource);
        return fetch(`${config.baseUrl ?? ''}${url}`, {
          method: verb?.toUpperCase(),
          headers: {
            ...config.headers,
            ...request.headers,
            ...(request.json ? jsonHeaders : {}),
          },
          body: request.json ? JSON.stringify(request.json) : request.body,
        });
      };

  return {
    ...(Object.fromEntries(
      httpVerbs.map((verb) => [verb, request(verb.toUpperCase())]),
    ) as DefaultHttpClient),
    request,
  };
};
