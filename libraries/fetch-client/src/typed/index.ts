import {
  BodyType,
  FetchClient,
  FormDataSource,
  ParametersType,
  QueryKey,
  TypedEndpointOptions,
  TypedNoPayloadEndpoint,
  TypedPayloadEndpoint,
  TypedPayloadProgressObserverEndpoint,
  TypedPayloadProgressObserverEndpointOptions,
  UploadProgressEvent,
  Verb,
} from '../types';
import { fetchClient } from '../base';
import { convertToFormData, replacePathParams, stringifyValues } from '../utils';

export interface BaseEndpointDefinition {
  path: string;
  method: Verb;
}

export interface EndpointDefinition extends BaseEndpointDefinition {
  convertToFormData?: false;
}

export interface FormDataEndpointDefinition extends BaseEndpointDefinition {
  convertToFormData: true;
}

const createQueryKeyFn =
  (endpointDefinition: FormDataEndpointDefinition | EndpointDefinition) =>
    ({
      pathParameters,
      queryParameters,
    }: {
      pathParameters?: ParametersType;
      queryParameters?: ParametersType;
    }) =>
      [
        ...replacePathParams(endpointDefinition.path, pathParameters).split('/'),
        queryParameters,
      ].filter(Boolean) as QueryKey;

const createCallableFn =
  <
    Output,
    Input extends BodyType | undefined,
    Error,
    PathParameters extends ParametersType = undefined,
    QueryParameters extends ParametersType = undefined,
  >(
    endpointDefinition: Input extends FormDataSource
      ? FormDataEndpointDefinition
      : EndpointDefinition,
    defaultFetchClient: FetchClient,
  ) =>
    async (
      input: Input,
      options?: TypedEndpointOptions<PathParameters, QueryParameters>,
    ): Promise<{ data: Output } | { error: Error }> => {
      const bodyObject = endpointDefinition.convertToFormData
        ? {
          body: convertToFormData(input as FormDataSource),
        }
        : input instanceof File ||
          input instanceof FormData ||
          input instanceof Blob ||
          input instanceof URLSearchParams ||
          input instanceof ArrayBuffer ||
          typeof input === 'string'
          ? { body: input }
          : { json: input };
      return (options?.fetchClient ?? defaultFetchClient)
        .request(endpointDefinition.method)(
          replacePathParams(endpointDefinition.path, options?.pathParameters) +
          (options?.queryParameters
            ? '?' + new URLSearchParams(stringifyValues(options?.queryParameters)).toString()
            : ''),
          {
            ...bodyObject,
            headers: options?.headers,
            signal: options?.signal,
          },
        )
        .then(async (result) => {
          const parsed = await result.json();
          return result.ok
            ? {
              data: parsed as Output,
            }
            : { error: parsed as Error };
        });
    };

export const typedPayloadEndpoint = <
  Output,
  Input extends BodyType,
  Error = unknown,
  PathParameters extends ParametersType = undefined,
  QueryParameters extends ParametersType = undefined,
>(
  endpointDefinition: Input extends FormDataSource
    ? FormDataEndpointDefinition
    : EndpointDefinition,
  defaultFetchClient: FetchClient = fetchClient(),
) => {
  const callable = createCallableFn<
    Output,
    Input,
    Error,
    PathParameters,
    QueryParameters
  >(endpointDefinition, defaultFetchClient) as Partial<
    TypedPayloadEndpoint<Output, Input, Error, PathParameters, QueryParameters>
  >;
  callable.queryKey = createQueryKeyFn(endpointDefinition);
  return callable as TypedPayloadEndpoint<
    Output,
    Input,
    Error,
    PathParameters,
    QueryParameters
  >;
};

export const typedNoPayloadEndpoint = <
  Output,
  Error = unknown,
  PathParameters extends ParametersType = undefined,
  QueryParameters extends ParametersType = undefined,
>(
  endpointDefinition: EndpointDefinition,
  defaultFetchClient: FetchClient = fetchClient(),
) => {
  const callable = (
    options?: TypedEndpointOptions<PathParameters, QueryParameters>,
  ) =>
    createCallableFn<Output, undefined, Error, PathParameters, QueryParameters>(
      endpointDefinition,
      defaultFetchClient,
    )(undefined, options) as Partial<
      TypedNoPayloadEndpoint<Output, Error, PathParameters, QueryParameters>
    >;
  callable.queryKey = createQueryKeyFn(endpointDefinition);
  return callable as TypedNoPayloadEndpoint<
    Output,
    Error,
    PathParameters,
    QueryParameters
  >;
};

type XhrBodyInput =
  | FormData
  | Blob
  | File
  | ArrayBuffer
  | URLSearchParams
  | string
  | null
  | undefined;

const isFormDataLike = (input: unknown): input is FormData =>
  typeof FormData !== 'undefined' && input instanceof FormData;

const isJsonBody = (input: unknown): boolean =>
  input !== null &&
  input !== undefined &&
  !(typeof File !== 'undefined' && input instanceof File) &&
  !isFormDataLike(input) &&
  !(typeof Blob !== 'undefined' && input instanceof Blob) &&
  !(input instanceof URLSearchParams) &&
  !(input instanceof ArrayBuffer) &&
  typeof input !== 'string';

/**
 * Fire an `XMLHttpRequest`. Used by {@link typedPayloadProgressObserverEndpoint}
 * because `fetch` does not expose request-body upload progress in browsers or
 * React Native today, while `XMLHttpRequest.upload.onprogress` does.
 *
 * The shape of the resolved promise mirrors the typed endpoints
 * (`{ data } | { error }`) so callers can treat both interchangeably.
 */
export const xhrRequest = <Output, Error>({
  url,
  method,
  body,
  headers,
  signal,
  onUploadProgress,
}: {
  url: string;
  method: string;
  body: XhrBodyInput;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  onUploadProgress?: (event: UploadProgressEvent) => void;
}): Promise<{ data: Output } | { error: Error }> =>
  new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url, true);
    if (headers) {
      for (const [k, v] of Object.entries(headers)) {
        try {
          xhr.setRequestHeader(k, v);
        } catch {
          // Some headers (e.g. Content-Type for multipart) are forbidden and
          // must be set by the browser; silently ignore.
        }
      }
    }

    const startedAt = Date.now();

    if (onUploadProgress && xhr.upload) {
      xhr.upload.onprogress = (e: ProgressEvent) => {
        const total = e.lengthComputable ? e.total : 0;
        const loaded = e.loaded;
        const percent = total > 0 ? (loaded / total) * 100 : 0;
        const elapsed = Date.now() - startedAt;
        // Skip the early frames where the rate estimate is dominated by
        // connection setup and TLS noise, otherwise the displayed ETA jumps
        // around wildly for the first second of the upload.
        const estimatedRemainingMs =
          total > 0 && loaded > 0 && elapsed >= 250 && percent >= 1
            ? Math.max(0, Math.round((elapsed / loaded) * (total - loaded)))
            : undefined;
        onUploadProgress({ loaded, total, percent, estimatedRemainingMs });
      };
    }

    xhr.onload = () => {
      let parsed: unknown;
      try {
        parsed = xhr.responseText ? JSON.parse(xhr.responseText) : undefined;
      } catch {
        parsed = undefined;
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        if (onUploadProgress) {
          onUploadProgress({
            loaded: 1,
            total: 1,
            percent: 100,
            estimatedRemainingMs: 0,
          });
        }
        resolve({ data: parsed as Output });
      } else {
        resolve({ error: parsed as Error });
      }
    };

    xhr.onerror = () => reject(new Error('Network error'));
    xhr.ontimeout = () => reject(new Error('Request timed out'));

    if (signal) {
      if (signal.aborted) {
        xhr.abort();
        const err = new Error('Aborted');
        err.name = 'AbortError';
        reject(err);
        return;
      }
      signal.addEventListener('abort', () => {
        xhr.abort();
        const err = new Error('Aborted');
        err.name = 'AbortError';
        reject(err);
      });
    }

    xhr.send(body as XMLHttpRequestBodyInit | null);
  });

/**
 * Sibling of {@link typedPayloadEndpoint} that routes the request through
 * {@link xhrRequest} so callers can subscribe to upload progress events via
 * `options.onUploadProgress`. Resolves baseUrl + auth headers via the
 * `FetchClient`'s {@link ConfigAwareClient.getConfig} getter, so it shares
 * configuration with the regular fetch path.
 */
export const typedPayloadProgressObserverEndpoint = <
  Output,
  Input extends BodyType,
  Error = unknown,
  PathParameters extends ParametersType = undefined,
  QueryParameters extends ParametersType = undefined,
>(
  endpointDefinition: Input extends FormDataSource
    ? FormDataEndpointDefinition
    : EndpointDefinition,
  defaultFetchClient: FetchClient = fetchClient(),
) => {
  const callable = async (
    input: Input,
    options?: TypedPayloadProgressObserverEndpointOptions<
      PathParameters,
      QueryParameters
    >,
  ): Promise<{ data: Output } | { error: Error }> => {
    const path =
      replacePathParams(endpointDefinition.path, options?.pathParameters) +
      (options?.queryParameters
        ? '?' +
          new URLSearchParams(
            stringifyValues(options?.queryParameters),
          ).toString()
        : '');

    const client = options?.fetchClient ?? defaultFetchClient;
    const config = await client.getConfig();
    const url = `${config.baseUrl ?? ''}${path}`;

    let body: XhrBodyInput;
    const extraHeaders: Record<string, string> = {};
    if (endpointDefinition.convertToFormData) {
      body = convertToFormData(input as FormDataSource);
    } else if (isJsonBody(input)) {
      body = JSON.stringify(input);
      extraHeaders['Content-Type'] = 'application/json';
      extraHeaders['Accept'] = 'application/json';
    } else {
      body = input as XhrBodyInput;
    }

    const headers = {
      ...(config.headers ?? {}),
      ...extraHeaders,
      ...(options?.headers ?? {}),
    };

    return xhrRequest<Output, Error>({
      url,
      method: endpointDefinition.method.toUpperCase(),
      body,
      headers,
      signal: options?.signal,
      onUploadProgress: options?.onUploadProgress,
    });
  };

  (callable as Partial<
    TypedPayloadProgressObserverEndpoint<
      Output,
      Input,
      Error,
      PathParameters,
      QueryParameters
    >
  >).queryKey = createQueryKeyFn(endpointDefinition);

  return callable as TypedPayloadProgressObserverEndpoint<
    Output,
    Input,
    Error,
    PathParameters,
    QueryParameters
  >;
};
