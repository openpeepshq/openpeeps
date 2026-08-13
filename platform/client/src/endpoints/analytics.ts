import type { FetchClient } from '@openpeepshq/fetch-client';
import type {
  AnalyticsClicksIngest,
  SuccessResponse,
} from '@openpeepshq/common';
import { allpeepPayloadEndpoint } from './helpers';

export const analytics = (rawClient: FetchClient) => ({
  recordClicks: allpeepPayloadEndpoint<SuccessResponse, AnalyticsClicksIngest>(
    rawClient,
    '/analytics/clicks',
  ),
});
