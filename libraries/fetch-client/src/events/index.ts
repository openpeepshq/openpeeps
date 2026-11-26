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

// SSE event ids are strings on the wire. Compare numerically when both sides
// are integers, otherwise lexicographically (uuidv7 ids sort lexicographically
// in time order).
const isEventIdOlderOrEqual = (lastId: string, id: string) => {
  const numeric = /^\d+$/.test(lastId) && /^\d+$/.test(id);
  return numeric ? Number(lastId) >= Number(id) : lastId >= id;
};

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
  onError,
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
      if (onlyNew && lastId && isEventIdOlderOrEqual(lastId, id)) {
        return;
      }
      lastId = id;
      await handler(decodeAndParse<EventType>(data));
    },
  );
  // sse.js fires `error` with the HTTP status and response body when the
  // request returns non-OK (e.g. a 401 authNeeded from the join endpoint).
  // The listener is registered unconditionally so the fire-once contract is
  // explicit, but it is a no-op unless an `onError` callback is provided.
  // `settled` guarantees at most one `onError` call per source instance
  // (sse.js auto-reconnect would otherwise re-arm the relay); `closed`
  // suppresses errors after the caller has closed the stream.
  let settled = false;
  let closed = false;
  const originalClose = source.close.bind(source);
  source.close = () => {
    closed = true;
    originalClose();
  };
  source.addEventListener(
    'error',
    (event: { responseCode?: number; data?: string }) => {
      if (settled || closed) {
        return;
      }
      settled = true;
      if (!onError) {
        return;
      }
      let key: string | undefined;
      let message: string | undefined;
      if (typeof event.data === 'string' && event.data.length > 0) {
        try {
          const body = JSON.parse(event.data) as {
            errorKey?: string;
            key?: string;
            message?: string;
          };
          key = body.errorKey ?? body.key;
          message = body.message;
        } catch {
          message = event.data;
        }
      }
      onError({ status: event.responseCode, key, message });
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
