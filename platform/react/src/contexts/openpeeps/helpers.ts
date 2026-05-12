import type {
  openpeepsClient,
  OpenpeepsNoPayloadEndpoint,
  OpenpeepsPayloadEndpoint,
} from '@openpeeps/client';
import type {
  ChronologicalInfiniteQueryParams,
  ProfileWithMeta,
  PublicAccount,
  SuccessFailureResponse,
  TokenResponse,
} from '@openpeeps/common/types';
import type {
  BodyType,
  EventSourceOptions,
  ParametersType,
  TypedNoPayloadEventSource,
  TypedPayloadProgressObserverEndpoint,
  UploadProgressEvent,
} from '@openpeeps/fetch-client';
import {
  QueryClient,
  QueryClientContext,
  useInfiniteQuery,
  useQuery,
  type InfiniteData,
  type QueryKey,
} from '@tanstack/react-query';
import { useContext, useEffect, useState } from 'react';
import { useCredentialsStore } from '../credentialsStore';

const authHeaders = async () => {
  const { token } = (await useCredentialsStore().credentialsStore.get()) ?? {};
  return token
    ? {
        Authorization: `Bearer ${token}`,
      }
    : undefined;
};

const throwError =
  <O>(callbacks?: {
    onSuccess?: (o: O) => void | Promise<void>;
    onError?: (e: SuccessFailureResponse) => void | Promise<void>;
  }) =>
  async (result: { data: O } | { error: SuccessFailureResponse }) => {
    if ('data' in result) {
      await callbacks?.onSuccess?.(result.data);
      return result.data;
    } else {
      await callbacks?.onError?.(result.error);
      throw result.error;
    }
  };

const handleMutationResult = <O>(
  queryClient: QueryClient,
  queryKeys?: QueryKey[],
) =>
  throwError<O>({
    onSuccess: async () => {
      if (queryKeys) {
        for (const queryKey of queryKeys) {
          await queryClient.invalidateQueries({ queryKey });
        }
      }
    },
  });

export const retrieveProfile =
  (client: ReturnType<typeof openpeepsClient>) => () =>
    client.profiles.current
      .read()
      .then((r) => ('data' in r ? r.data : undefined));
export const retrieveAccount =
  (client: ReturnType<typeof openpeepsClient>) => () =>
    client.accounts.current
      .read()
      .then((r) => ('data' in r ? r.data : undefined));

export const updateCredentialsWrapper =
  <Input>(
    fn: (
      i: Input,
    ) => Promise<{ data: TokenResponse } | { error: SuccessFailureResponse }>,
    retrieveProfile: () => Promise<ProfileWithMeta | undefined>,
    setCurrentProfile: (profile: ProfileWithMeta | undefined) => void,
    retrieveAccount: () => Promise<PublicAccount | undefined>,
    setCurrentAccount: (account: PublicAccount | undefined) => void,
  ) =>
  () => {
    const { credentialsStore } = useCredentialsStore();
    const queryClient = useContext(QueryClientContext);
    return (i: Input) =>
      fn(i).then(
        throwError({
          onSuccess: async (tr: TokenResponse) => {
            credentialsStore.set({ token: tr.token });
            queryClient?.invalidateQueries({
              queryKey: ['profiles', 'current'],
            });
            const profile = await retrieveProfile();
            setCurrentProfile(profile);
            const account = await retrieveAccount();
            setCurrentAccount(account);
          },
        }),
      );
  };

export const apiHook = <
  Output,
  PathParams extends Record<string, string> | undefined = undefined,
  QueryParams extends Record<string, string> | undefined = undefined,
>(
  endpoint: OpenpeepsNoPayloadEndpoint<Output, PathParams, QueryParams>,
  options?: {
    pathParams?: PathParams;
    queryParams?: QueryParams;
    refetchInterval?: number;
    /** When false, the query does not run (TanStack Query `enabled`). */
    enabled?: boolean;
    onSuccess?: (output: Output) => void | Promise<void>;
    onError?: (error: SuccessFailureResponse) => void | Promise<void>;
    preQueryCheck?: (options: {
      endpoint: OpenpeepsNoPayloadEndpoint<Output, PathParams, QueryParams>;
      pathParams?: PathParams;
      queryParams?: QueryParams;
    }) => void | Promise<void>;
  },
) =>
  useQuery<Output, SuccessFailureResponse>({
    queryKey: endpoint.queryKey({
      pathParameters: options?.pathParams,
      queryParameters: options?.queryParams,
    }),
    enabled: options?.enabled ?? true,
    queryFn: async () => {
      await options?.preQueryCheck?.({
        endpoint,
        pathParams: options?.pathParams,
        queryParams: options?.queryParams,
      });
      return endpoint({
        pathParameters: options?.pathParams,
        queryParameters: options?.queryParams,
      }).then(
        throwError({
          onSuccess: options?.onSuccess,
          onError: options?.onError,
        }),
      );
    },
    retry: false,
    refetchInterval: options?.refetchInterval,
  });

export const infiniteChronologicalQueryApiHook = <
  Output,
  PathParams extends ParametersType = undefined,
  QueryParams extends ParametersType = undefined,
>(
  endpoint: OpenpeepsNoPayloadEndpoint<Output, PathParams, QueryParams>,
  options?: {
    pathParams?: PathParams;
    queryParams?: QueryParams & ChronologicalInfiniteQueryParams;
    refetchInterval?: number;
    onSuccess?: (output: Output) => void | Promise<void>;
    onError?: (error: SuccessFailureResponse) => void | Promise<void>;
    preQueryCheck?: (options: {
      endpoint: OpenpeepsNoPayloadEndpoint<Output, PathParams, QueryParams>;
      pathParams?: PathParams;
      queryParams?: QueryParams & ChronologicalInfiniteQueryParams;
    }) => void | Promise<void>;
    initialPageParam?: unknown;
  },
) =>
  useInfiniteQuery<
    Output,
    SuccessFailureResponse,
    InfiniteData<Output>,
    QueryKey,
    ChronologicalInfiniteQueryParams
  >({
    queryKey: endpoint.queryKey({
      pathParameters: options?.pathParams,
      queryParameters: options?.queryParams,
    }),
    queryFn: async ({ pageParam }) => {
      const currentQueryParams = {
        ...options?.queryParams,
        start: (pageParam as ChronologicalInfiniteQueryParams)?.start,
        limit: (pageParam as ChronologicalInfiniteQueryParams)?.limit,
      } as any;

      await options?.preQueryCheck?.({
        endpoint,
        pathParams: options?.pathParams,
        queryParams: currentQueryParams,
      });
      return await endpoint({
        pathParameters: options?.pathParams,
        queryParameters: currentQueryParams,
      }).then(
        throwError({
          onSuccess: options?.onSuccess,
          onError: options?.onError,
        }),
      );
    },
    initialPageParam: options?.queryParams,
    getNextPageParam: (lastPage: Output) => {
      const last = Array.isArray(lastPage) ? lastPage : [];
      if (last.length > 0) {
        const lastPost = last[last.length - 1];
        return {
          start: lastPost?.id,
          limit: options?.queryParams?.limit,
        };
      }
      return undefined;
    },
    retry: false,
    refetchInterval: options?.refetchInterval,
  });

export const infiniteOffsetQueryApiHook = <
  Output,
  PathParams extends ParametersType = undefined,
  QueryParams extends ParametersType & { offset?: number; limit: number } = {
    offset?: number;
    limit: number;
  },
>(
  endpoint: OpenpeepsNoPayloadEndpoint<Output, PathParams, QueryParams>,
  options?: {
    pageSize: number;
    pathParams?: PathParams;
    queryParams?: QueryParams;
    refetchInterval?: number;
    onSuccess?: (output: Output) => void | Promise<void>;
    onError?: (error: SuccessFailureResponse) => void | Promise<void>;
    preQueryCheck?: (options: {
      endpoint: OpenpeepsNoPayloadEndpoint<Output, PathParams, QueryParams>;
      pathParams?: PathParams;
      queryParams?: QueryParams;
    }) => void | Promise<void>;
    initialPageParam?: unknown;
  },
) =>
  useInfiniteQuery<
    Output,
    SuccessFailureResponse,
    InfiniteData<Output>,
    QueryKey,
    number
  >({
    queryKey: endpoint.queryKey({
      pathParameters: options?.pathParams,
      queryParameters: options?.queryParams,
    }),
    queryFn: async ({ pageParam }) => {
      const baseParams: QueryParams = {
        ...options?.queryParams,
        limit: options?.pageSize,
      } as QueryParams;
      const queryParams = pageParam
        ? { ...baseParams, offset: pageParam }
        : baseParams;
      await options?.preQueryCheck?.({
        endpoint,
        pathParams: options?.pathParams,
        queryParams,
      });
      return await endpoint({
        pathParameters: options?.pathParams,
        queryParameters: queryParams,
      }).then(
        throwError({
          onSuccess: options?.onSuccess,
          onError: options?.onError,
        }),
      );
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, _, lastPageParam) => {
      const lastPageFull =
        Array.isArray(lastPage) && lastPage.length >= (options?.pageSize ?? 0);
      if (lastPageFull) {
        const nextPageParam = lastPageParam + (options?.pageSize ?? 0);
        return nextPageParam;
      }
      return undefined;
    },
    retry: false,
    refetchInterval: options?.refetchInterval,
  });

export const payloadMutation =
  <
    Input extends BodyType,
    Output,
    PathParams extends Record<string, string> | undefined = undefined,
    QueryParams extends Record<string, string> | undefined = undefined,
  >(
    endpoint: OpenpeepsPayloadEndpoint<Output, Input, PathParams, QueryParams>,
    queryKeys?: string[][],
  ) =>
  (defaultPathParams?: PathParams extends undefined ? never : PathParams) => {
    const queryClient = useContext(QueryClientContext);

    if (!queryClient) {
      throw new Error('QueryClientContext is not set');
    }

    return async (
      input: Input,
      pathParams?: PathParams extends undefined ? never : PathParams,
      queryParams?: QueryParams extends undefined ? never : QueryParams,
      headers?: Record<string, string>,
    ): Promise<Output> =>
      endpoint(input, {
        pathParameters: {
          ...(defaultPathParams ?? {}),
          ...(pathParams ?? {}),
        } as PathParams,
        queryParameters: queryParams,
        headers,
      }).then(handleMutationResult<Output>(queryClient, queryKeys));
  };

/**
 * Like {@link payloadMutation} but for endpoints that route through
 * `XMLHttpRequest` and accept an `onUploadProgress` callback (typically
 * media uploads).
 */
export const payloadProgressMutation =
  <
    Input extends BodyType,
    Output,
    PathParams extends Record<string, string> | undefined = undefined,
    QueryParams extends Record<string, string> | undefined = undefined,
  >(
    endpoint: TypedPayloadProgressObserverEndpoint<
      Output,
      Input,
      SuccessFailureResponse,
      PathParams,
      QueryParams
    >,
    queryKeys?: string[][]
  ) =>
    (defaultPathParams?: PathParams extends undefined ? never : PathParams) => {
      const queryClient = useContext(QueryClientContext);

      if (!queryClient) {
        throw new Error('QueryClientContext is not set');
      }

      return async (
        input: Input,
        pathParams?: PathParams extends undefined ? never : PathParams,
        queryParams?: QueryParams extends undefined ? never : QueryParams,
        headers?: Record<string, string>,
        onUploadProgress?: (event: UploadProgressEvent) => void,
      ): Promise<Output> =>
        endpoint(input, {
          pathParameters: {
            ...(defaultPathParams ?? {}),
            ...(pathParams ?? {}),
          } as PathParams,
          queryParameters: queryParams,
          headers,
          onUploadProgress,
        }).then(handleMutationResult<Output>(queryClient, queryKeys));
    };

export const noPayloadMutation =
  <
    Output,
    PathParams extends Record<string, string> | undefined = undefined,
    QueryParams extends Record<string, string> | undefined = undefined,
  >(
    endpoint: OpenpeepsNoPayloadEndpoint<Output, PathParams, QueryParams>,
    queryKeys?: string[][],
  ) =>
  (defaultPathParams?: PathParams extends undefined ? never : PathParams) => {
    const queryClient = useContext(QueryClientContext);

    if (!queryClient) {
      throw new Error('QueryClientContext is not set');
    }

    return async (
      pathParams?: PathParams extends undefined ? never : PathParams,
      queryParams?: QueryParams extends undefined ? never : QueryParams,
      headers?: Record<string, string>,
    ): Promise<Output> =>
      endpoint({
        pathParameters: {
          ...(defaultPathParams ?? {}),
          ...(pathParams ?? {}),
        } as PathParams,
        queryParameters: queryParams,
        headers,
      }).then(handleMutationResult<Output>(queryClient, queryKeys));
  };

export const noPayloadStream = <
  EventType,
  PathParams extends Record<string, string> | undefined = undefined,
  QueryParams extends Record<string, string> | undefined = undefined,
>(
  typedEventSource: TypedNoPayloadEventSource<
    EventType,
    PathParams,
    QueryParams
  >,
) => ({
  last: (
    options: Omit<
      EventSourceOptions<EventType, PathParams, QueryParams>,
      'handler'
    >,
  ) => {
    const [state, setState] = useState<EventType>();

    const sourcePromise = authHeaders().then((authHeaders) =>
      typedEventSource({
        ...options,
        headers: {
          ...(options.headers || {}),
          ...authHeaders,
        },
        handler: (e: EventType) => setState(e),
      }),
    );
    sourcePromise.then((source) => source.stream());

    useEffect(() => {
      return () => {
        sourcePromise.then((source) => source.close());
      };
    }, [state]);
    return state;
  },
  all: (
    options: Omit<
      EventSourceOptions<EventType, PathParams, QueryParams>,
      'handler'
    >,
  ) => {
    const [state, setState] = useState<EventType[]>([]);
    const sourcePromise = authHeaders().then((authHeaders) =>
      typedEventSource({
        ...options,
        headers: {
          ...(options.headers || {}),
          ...authHeaders,
        },
        handler: (e: EventType) => setState((prev) => [...prev, e]),
      }),
    );
    sourcePromise.then((source) => source.stream());
    useEffect(() => {
      return () => {
        sourcePromise.then((source) => source.close());
      };
    }, [state]);
    return state;
  },
});
