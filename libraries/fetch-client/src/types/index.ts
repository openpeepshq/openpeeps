import { SSE } from 'sse.js';

export const httpVerbs = [
  'get',
  'post',
  'put',
  'patch',
  'head',
  'delete',
  'options',
  'connect',
  'trace',
] as const;
export type Verb = (typeof httpVerbs)[number];

export interface ClientConfig {
  headers?: Record<string, string>;
  baseUrl?: string;
}

export type ClientConfigSource =
  | ClientConfig
  | (() => Promise<ClientConfig> | ClientConfig);

type RequestBodyType =
  | FormData
  | Blob
  | File
  | string
  | URLSearchParams
  | ArrayBuffer;

export interface Request {
  headers?: Record<string, string>;
  json?: unknown;
  body?: RequestBodyType;
  signal?: AbortSignal;
}

export interface Method {
  (url: string, request?: Request): Promise<Response>;
}

export type DefaultHttpClient = {
  [Property in Verb]: Method;
};

export interface GenericRequestClient {
  request: (verb: string) => Method;
}

export interface ConfigAwareClient {
  /**
   * Resolves the underlying client config (baseUrl + headers). Useful for
   * paths (e.g. XHR uploads) that need to construct an absolute URL or apply
   * the same auth headers as the regular fetch path without re-deriving them.
   */
  getConfig: () => Promise<ClientConfig>;
}

export type FetchClient = DefaultHttpClient &
  GenericRequestClient &
  ConfigAwareClient;

export interface TypedEndpointOptions<PathParameters, QueryParameters> {
  pathParameters?: PathParameters;
  queryParameters?: QueryParameters;
  headers?: Record<string, string>;
  fetchClient?: FetchClient;
  signal?: AbortSignal;
}

export interface UploadProgressEvent {
  loaded: number;
  total: number;
  percent: number;
  /**
   * Linear extrapolation of the remaining upload time in milliseconds, based
   * on the elapsed wall-clock time and the current bytes-loaded ratio. Only
   * provided once the request has been streaming long enough to be meaningful
   * (≥250ms and ≥1% loaded); `undefined` otherwise. The final
   * `{ percent: 100 }` event reports `0`.
   */
  estimatedRemainingMs?: number;
}

export interface TypedPayloadProgressObserverEndpointOptions<
  PathParameters,
  QueryParameters,
> extends TypedEndpointOptions<PathParameters, QueryParameters> {
  /**
   * Called continuously as the request body is uploaded, plus a final
   * `{ loaded: 1, total: 1, percent: 100 }` event when the response arrives.
   */
  onUploadProgress?: (event: UploadProgressEvent) => void;
}

export type ParametersType = Record<string, string | number> | undefined;

export type QueryKey = [...string[], ParametersType] | string[];

export interface RecursiveStringRecord {
  [key: string]: string | RecursiveStringRecord;
}

export type Serializable =
  | string
  | number
  | boolean
  | null
  | undefined
  | Serializable[]
  | { [key: string | symbol]: Serializable }
  | RecursiveStringRecord;

export type FormDataSource = Record<
  string,
  string | Blob | File | string[] | Blob[] | File[]
>;

export type BodyType = RequestBodyType | Serializable | FormDataSource;

export interface TypedPayloadEndpoint<
  Output,
  Input extends BodyType,
  Error = unknown,
  PathParameters extends ParametersType = undefined,
  QueryParameters extends ParametersType = undefined,
> {
  (
    input: Input,
    params?: TypedEndpointOptions<PathParameters, QueryParameters>,
  ): Promise<{ data: Output } | { error: Error }>;
  queryKey: (params: {
    pathParameters?: PathParameters;
    queryParameters?: QueryParameters;
  }) => QueryKey;
}
export interface TypedNoPayloadEndpoint<
  Output,
  Error = unknown,
  PathParameters extends ParametersType = undefined,
  QueryParameters extends ParametersType = undefined,
> {
  (
    params?: TypedEndpointOptions<PathParameters, QueryParameters>,
  ): Promise<{ data: Output } | { error: Error }>;
  queryKey: (params: {
    pathParameters?: PathParameters;
    queryParameters?: QueryParameters;
  }) => QueryKey;
}

/**
 * Same call shape as {@link TypedPayloadEndpoint}, with the added option to
 * subscribe to `XMLHttpRequest.upload.onprogress` events. Used for endpoints
 * where the body is large enough that the caller wants byte-level upload
 * feedback (typically multipart media uploads).
 */
export interface TypedPayloadProgressObserverEndpoint<
  Output,
  Input extends BodyType,
  Error = unknown,
  PathParameters extends ParametersType = undefined,
  QueryParameters extends ParametersType = undefined,
> {
  (
    input: Input,
    params?: TypedPayloadProgressObserverEndpointOptions<
      PathParameters,
      QueryParameters
    >,
  ): Promise<{ data: Output } | { error: Error }>;
  queryKey: (params: {
    pathParameters?: PathParameters;
    queryParameters?: QueryParameters;
  }) => QueryKey;
}

export interface EventSourceOptions<
  EventType,
  PathParameters extends ParametersType = undefined,
  QueryParameters extends ParametersType = undefined,
> {
  pathParameters?: PathParameters;
  queryParameters?: QueryParameters;
  handler: (event: EventType) => void | Promise<void>;
  headers?: Record<string, string>;
  start?: boolean;
  onlyNew?: boolean;
  lastId?: string;
}

export interface BuildSourceOptions<
  EventType,
  PayloadType,
  PathParameters extends ParametersType = undefined,
  QueryParameters extends ParametersType = undefined,
> extends EventSourceOptions<EventType, PathParameters, QueryParameters> {
  config: ClientConfigSource;
  path: string;
  method?: Verb;
  eventName?: string;
  payload: PayloadType;
}

export interface TypedNoPayloadEventSource<
  EventType,
  PathParameters extends ParametersType = undefined,
  QueryParameters extends ParametersType = undefined,
> {
  (
    options: EventSourceOptions<EventType, PathParameters, QueryParameters>,
  ): Promise<SSE>;
}

export interface TypedPayloadEventSource<
  EventType,
  PayloadType,
  PathParameters extends ParametersType = undefined,
  QueryParameters extends ParametersType = undefined,
> {
  (
    payload: PayloadType,
    options: EventSourceOptions<EventType, PathParameters, QueryParameters>,
  ): Promise<SSE>;
}
