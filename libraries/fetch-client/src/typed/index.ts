import {
  BodyType,
  FetchClient,
  FormDataSource,
  ParametersType,
  QueryKey,
  TypedEndpointOptions,
  TypedNoPayloadEndpoint,
  TypedPayloadEndpoint,
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
          },
        )
        .then(async (result) =>
          result.ok
            ? {
              data: (await result.json()) as Output,
            }
            : { error: (await result.json()) as Error },
        );
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
