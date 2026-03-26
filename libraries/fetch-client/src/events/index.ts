import {
  BuildSourceOptions,
  ClientConfigSource,
  EventSourceOptions,
  ParametersType,
  TypedNoPayloadEventSource,
  TypedPayloadEventSource,
  Verb,
} from '../types';
import { SSE } from 'sse.js';
import { replacePathParams, resolveConfig, stringifyValues } from '../utils';

const decodeAndParse = <T>(data: string) =>
  JSON.parse(decodeURIComponent(data)) as T;

const buildSource = async <
  EventType,
  PayloadType,
  PathParameters extends ParametersType = undefined,
  QueryParameters extends ParametersType = undefined,
>({
  payload,
  config,
  path,
  method,
  eventName = 'message',
  pathParameters,
  queryParameters,
  headers,
  onlyNew,
  lastId,
  handler,
  start,
}: BuildSourceOptions<
  EventType,
  PayloadType,
  PathParameters,
  QueryParameters
>) => {
  const { baseUrl, headers: configHeaders } = await resolveConfig(config);
  const source = new SSE(
    baseUrl +
    replacePathParams(path, pathParameters) +
    '?' +
    new URLSearchParams(stringifyValues(queryParameters)).toString(),
    {
      payload: JSON.stringify(payload),
      headers: { ...configHeaders, ...headers },
      start: false,
      method: method?.toUpperCase() || 'GET',
    },
  );
  source.addEventListener(
    eventName,
    async ({ id, data }: { id: string; data: string }) => {
      if (onlyNew && lastId && lastId >= id) {
        return;
      }
      lastId = id;
      await handler(decodeAndParse<EventType>(data));
    },
  );
  if (start) {
    source.stream();
  }
  return source;
};

export const noPayloadEventSource =
  (config: ClientConfigSource) =>
    <
      EventType,
      PathParameters extends ParametersType = undefined,
      QueryParameters extends ParametersType = undefined,
    >(
      path: string,
      method?: Verb,
      eventName?: string,
    ): TypedNoPayloadEventSource<EventType, PathParameters, QueryParameters> =>
      (options: EventSourceOptions<EventType, PathParameters, QueryParameters>) =>
        buildSource<EventType, undefined, PathParameters, QueryParameters>({
          payload: undefined,
          config,
          path,
          method,
          eventName,
          ...options,
        });

export const payloadEventSource =
  (config: ClientConfigSource) =>
    <
      EventType,
      PayloadType,
      PathParameters extends ParametersType = undefined,
      QueryParameters extends ParametersType = undefined,
    >(
      path: string,
      method?: Verb,
      eventName?: string,
    ): TypedPayloadEventSource<
      EventType,
      PayloadType,
      PathParameters,
      QueryParameters
    > =>
      (
        payload: PayloadType,
        options: EventSourceOptions<EventType, PathParameters, QueryParameters>,
      ) =>
        buildSource<EventType, PayloadType, PathParameters, QueryParameters>({
          payload,
          config,
          path,
          method,
          eventName,
          ...options,
        });

export type { SSE } from 'sse.js';
