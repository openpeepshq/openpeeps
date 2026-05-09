import { createInfiniteQuery, createQuery, getQueryClientContext, type InfiniteData, type QueryClient } from '@tanstack/svelte-query';
import { authenticatedCoreApiClient, authHeaders } from './base';
import type { PayloadMutationSettings, NoPayloadMutationSettings } from '$lib/types';
import { readonly, writable } from 'svelte/store';
import {
	openpeepsClient,
	type OpenpeepsPayloadEndpoint,
	type OpenpeepsNoPayloadEndpoint
} from '@openpeeps/client';
import type {
	BodyType,
	EventSourceOptions,
	ParametersType,
	QueryKey,
	TypedNoPayloadEventSource,
	TypedPayloadEventSource
} from '@openpeeps/fetch-client';
import type { SuccessFailureResponse, TokenResponse } from '@openpeeps/common/types';
import { setCredentials } from '$lib/auth';

export const throwError =
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

export const throwErrorWrapperPayload =
	<O, I extends BodyType>(fn: OpenpeepsPayloadEndpoint<O, I>) =>
		(...p: Parameters<OpenpeepsPayloadEndpoint<O, I>>) =>
			fn(...p).then(throwError());

export const throwErrorWrapperNoPayload =
	<O>(fn: OpenpeepsNoPayloadEndpoint<O>) =>
		(...p: Parameters<OpenpeepsNoPayloadEndpoint<O>>) =>
			fn(...p).then(throwError());

const handleMutationResult = <O>(queryClient: QueryClient, queryKeys?: QueryKey[]) =>
	throwError<O>({
		onSuccess: async () => {
			if (queryKeys) {
				if (queryKeys) {
					for (const queryKey of queryKeys) {
						await queryClient.invalidateQueries({ queryKey });
					}
				}
			}
		}
	});

export const simpleStore = <
	Output,
	PathParams extends ParametersType = undefined,
	QueryParams extends ParametersType = undefined
>(
	endpoint: OpenpeepsNoPayloadEndpoint<Output, PathParams, QueryParams>,
	options?: {
		pathParams?: PathParams;
		queryParams?: QueryParams;
		refetchInterval?: number;
		customHandleError?: (e: SuccessFailureResponse) => Promise<Response>;
		onSuccess?: (output: Output) => void | Promise<void>;
		onError?: (error: SuccessFailureResponse) => void | Promise<void>;
		preQueryCheck?: (options: {
			endpoint: OpenpeepsNoPayloadEndpoint<Output, PathParams, QueryParams>;
			pathParams?: PathParams;
			queryParams?: QueryParams;
		}) => void;
	}
) =>
	createQuery<Output, SuccessFailureResponse>({
		queryKey: endpoint.queryKey({
			pathParameters: options?.pathParams,
			queryParameters: options?.queryParams
		}),
		queryFn: () => {
			options?.preQueryCheck?.({
				endpoint,
				pathParams: options?.pathParams,
				queryParams: options?.queryParams
			});
			return endpoint({
				pathParameters: options?.pathParams,
				queryParameters: options?.queryParams,
				fetchClient: authenticatedCoreApiClient()
			}).then(throwError({ onSuccess: options?.onSuccess, onError: options?.onError }));
		},
		retry: false,
		refetchInterval: options?.refetchInterval
	});


export const infiniteChronologicalStore = <
	Output,
	PathParams extends ParametersType = undefined,
	QueryParams extends ParametersType = undefined
>(
	endpoint: OpenpeepsNoPayloadEndpoint<Output, PathParams, QueryParams>,
	options?: {
		pathParams?: PathParams;
		queryParams?: QueryParams & { pageParam?: unknown };
		refetchInterval?: number;
		customHandleError?: (e: SuccessFailureResponse) => Promise<Response>;
		onSuccess?: (output: Output) => void | Promise<void>;
		onError?: (error: SuccessFailureResponse) => void | Promise<void>;
		preQueryCheck?: (options: {
			endpoint: OpenpeepsNoPayloadEndpoint<Output, PathParams, QueryParams>;
			pathParams?: PathParams;
			queryParams?: QueryParams & { pageParam?: unknown };
		}) => void | Promise<void>;
		initialPageParam?: unknown;
	}
) =>
	createInfiniteQuery<Output, SuccessFailureResponse>({
		queryKey: endpoint.queryKey({
			pathParameters: options?.pathParams,
			queryParameters: options?.queryParams
		}),
		queryFn: async ({ pageParam }) => {
			const baseParams = { ...options?.queryParams };
			const queryParams = pageParam
				? { ...baseParams, start: String(pageParam) }
				: baseParams;

			await options?.preQueryCheck?.({
				endpoint,
				pathParams: options?.pathParams,
				queryParams: {
					...queryParams,
					pageParam,
				} as QueryParams & { pageParam?: unknown },
			});

			const result = await endpoint({
				pathParameters: options?.pathParams,
				queryParameters: queryParams as QueryParams,
				fetchClient: authenticatedCoreApiClient()
			}).then(
				throwError({
					onSuccess: options?.onSuccess,
					onError: options?.onError,
				})
			);

			return result;
		},
		initialPageParam: undefined,
		getNextPageParam: (lastPage: Output) => {

			const posts = Array.isArray(lastPage) ? lastPage : [];
			if (posts.length > 0) {
				const lastPost = posts[posts.length - 1];
				const nextPageParam = lastPost?.id;

				if (nextPageParam) {
					return nextPageParam;
				}
			}
		},
		retry: false,
		refetchInterval: options?.refetchInterval
	});

export const infiniteOffsetStore = <
	Output,
	PathParams extends Record<string, string | number> | undefined = undefined,
	QueryParams extends Record<string, string | number> & { offset?: number, limit: number } = { offset?: number, limit: number }
>(
	endpoint: OpenpeepsNoPayloadEndpoint<Output, PathParams, QueryParams>,
	options?: {
		pageSize: number;
		pathParams?: PathParams;
		queryParams?: Omit<QueryParams, 'offset' | 'limit'>;
		refetchInterval?: number;
		customHandleError?: (e: SuccessFailureResponse) => Promise<Response>;
		onSuccess?: (output: Output) => void | Promise<void>;
		onError?: (error: SuccessFailureResponse) => void | Promise<void>;
		preQueryCheck?: (options: {
			endpoint: OpenpeepsNoPayloadEndpoint<Output, PathParams, QueryParams>;
			pathParams?: PathParams;
			queryParams?: QueryParams;
		}) => void | Promise<void>;
		initialPageParam?: unknown;
	}
) =>
	createInfiniteQuery<Output, SuccessFailureResponse, InfiniteData<Output>, QueryKey, number>({
		queryKey: endpoint.queryKey({
			pathParameters: options?.pathParams,
		}),
		queryFn: async ({ pageParam }) => {
			const baseParams: QueryParams = { ...options?.queryParams, limit: options?.pageSize } as QueryParams;
			const queryParams = pageParam
				? { ...baseParams, offset: pageParam }
				: baseParams;
			await options?.preQueryCheck?.({
				endpoint,
				pathParams: options?.pathParams,
				queryParams,
			});

			const result = await endpoint({
				pathParameters: options?.pathParams,
				queryParameters: queryParams,
				fetchClient: authenticatedCoreApiClient()
			}).then(
				throwError({
					onSuccess: options?.onSuccess,
					onError: options?.onError,
				})
			);
			return result;
		},
		initialPageParam: 0,
		getNextPageParam: (lastPage, _, lastPageParam) => {
			const lastPageFull = Array.isArray(lastPage) && lastPage.length >= (options?.pageSize ?? 0);
			if (lastPageFull) {
				const nextPageParam = lastPageParam + (options?.pageSize ?? 0);
				return nextPageParam;
			}
		},
		retry: false,
		refetchInterval: options?.refetchInterval
	});


export const payloadMutation =
	<
		Input extends BodyType,
		Output,
		PathParams extends Record<string, string> | undefined = undefined,
		QueryParams extends Record<string, string> | undefined = undefined
	>(
		endpoint: OpenpeepsPayloadEndpoint<Output, Input, PathParams, QueryParams>,
		{ queryKeys }: PayloadMutationSettings = {}
	) =>
		(defaultPathParams?: PathParams extends undefined ? never : PathParams) => {
			const queryClient = getQueryClientContext();

			return async (
				input: Input,
				pathParams?: PathParams extends undefined ? never : PathParams,
				queryParams?: QueryParams extends undefined ? never : QueryParams,
				headers?: Record<string, string>,
				signal?: AbortSignal
			): Promise<Output> =>
				endpoint(input, {
					pathParameters: { ...(defaultPathParams ?? {}), ...(pathParams ?? {}) } as PathParams,
					queryParameters: queryParams,
					headers,
					fetchClient: authenticatedCoreApiClient(),
					signal
				}).then(handleMutationResult<Output>(queryClient, queryKeys));
		};

export const noPayloadMutation =
	<
		Output,
		PathParams extends Record<string, string> | undefined = undefined,
		QueryParams extends Record<string, string> | undefined = undefined
	>(
		endpoint: OpenpeepsNoPayloadEndpoint<Output, PathParams, QueryParams>,
		{ queryKeys }: NoPayloadMutationSettings = {}
	) =>
		(defaultPathParams?: PathParams extends undefined ? never : PathParams) => {
			const queryClient = getQueryClientContext();

			return async (
				pathParams?: PathParams extends undefined ? never : PathParams,
				queryParams?: QueryParams extends undefined ? never : QueryParams,
				headers?: Record<string, string>
			): Promise<Output> =>
				endpoint({
					pathParameters: { ...(defaultPathParams ?? {}), ...(pathParams ?? {}) } as PathParams,
					queryParameters: queryParams,
					headers,
					fetchClient: authenticatedCoreApiClient()
				}).then(handleMutationResult<Output>(queryClient, queryKeys));
		};

export const noPayloadStream = <
	EventType,
	PathParams extends Record<string, string> | undefined = undefined,
	QueryParams extends Record<string, string> | undefined = undefined
>(
	typedEventSource: TypedNoPayloadEventSource<EventType, PathParams, QueryParams>
) => ({
	last: (options: Omit<EventSourceOptions<EventType, PathParams, QueryParams>, 'handler'>) => {
		const store = writable<EventType | undefined>();
		const sourcePromise = typedEventSource({
			...options,
			headers: {
				...(options.headers || {}),
				...authHeaders()
			},
			handler: (e: EventType) => store.set(e)
		});
		sourcePromise.then((source) => source.stream());
		return {
			...readonly(store),
			stop: () => {
				sourcePromise.then((source) => source.close());
			}
		};
	},
	all: (options: Omit<EventSourceOptions<EventType, PathParams, QueryParams>, 'handler'>) => {
		const store = writable<EventType[]>([]);
		const sourcePromise = typedEventSource({
			...options,
			headers: {
				...(options.headers || {}),
				...authHeaders()
			},

			handler: (e: EventType) => store.update((list) => [...list, e])
		});
		sourcePromise.then((source) => source.stream());
		return {
			...readonly(store),
			stop: () => {
				sourcePromise.then((source) => source.close());
			}
		};
	}
});

export const payloadStream = <
	EventType,
	PayloadType,
	PathParams extends Record<string, string> | undefined = undefined,
	QueryParams extends Record<string, string> | undefined = undefined
>(
	typedEventSource: TypedPayloadEventSource<EventType, PayloadType, PathParams, QueryParams>
) => ({
	last: (
		payload: PayloadType,
		options: Omit<EventSourceOptions<EventType, PathParams, QueryParams>, 'handler'>
	) => {
		const store = writable<EventType | undefined>();
		const sourcePromise = typedEventSource(payload, {
			...options,
			headers: {
				...(options.headers || {}),
				...authHeaders()
			},
			handler: (e: EventType) => store.set(e)
		});
		sourcePromise.then((source) => source.stream());
		return {
			...readonly(store),
			stop: () => {
				sourcePromise.then((source) => source.close());
			}
		};
	},
	all: (
		payload: PayloadType,
		options: Omit<EventSourceOptions<EventType, PathParams, QueryParams>, 'handler'>
	) => {
		const store = writable<EventType[]>([]);
		const sourcePromise = typedEventSource(payload, {
			...options,
			headers: {
				...(options.headers || {}),
				...authHeaders()
			},
			handler: (e: EventType) => store.update((list) => [...list, e])
		});
		sourcePromise.then((source) => source.stream());
		return {
			...readonly(store),
			stop: () => {

				sourcePromise.then((source) => source.close());
			}
		};
	}
});

export const client = openpeepsClient();

export const updateCredentialsWrapper =
	<Input>(fn: (i: Input) => Promise<{ data: TokenResponse } | { error: SuccessFailureResponse }>) =>
		(i: Input) =>
			fn(i).then(
				throwError({ onSuccess: (tr: TokenResponse) => setCredentials({ token: tr.token }) })
			);