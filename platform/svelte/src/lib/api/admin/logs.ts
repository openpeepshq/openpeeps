import { createQuery } from '@tanstack/svelte-query';
import type { LogRow, SuccessFailureResponse } from '@openpeeps/common/types';
import { format } from 'date-fns/format';
import { derived, type Readable } from 'svelte/store';
import { authenticatedCoreApiClient } from '../base';
import { client, throwError } from '../helpers';

const todayString = () => format(new Date(), 'yyyy-MM-dd');

export const adminLogsStore = (dateStore: Readable<string>) =>
	createQuery<LogRow[], SuccessFailureResponse>(
		derived(dateStore, ($date) => ({
			queryKey: client.admin.logs.list.queryKey({
				queryParameters: { date: $date },
			}),
			queryFn: () =>
				client.admin.logs
					.list({
						queryParameters: { date: $date },
						fetchClient: authenticatedCoreApiClient(),
					})
					.then(throwError()),
			retry: false,
			refetchInterval: $date === todayString() ? 5000 : undefined,
		})),
	);
