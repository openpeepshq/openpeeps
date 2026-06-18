import type { FetchClient } from '@openpeeps/fetch-client';
import type {
  PublicAccount,
  PushSubscription,
  PushSubscriptionData,
  SuccessResponse,
  UpdateAccountPasswordRequest,
} from '@openpeeps/common';
import { allpeepNoPayloadEndpoint, allpeepPayloadEndpoint } from './helpers';

export const accounts = (rawClient: FetchClient) => ({
  current: {
    update: allpeepPayloadEndpoint<
      SuccessResponse,
      UpdateAccountPasswordRequest
    >(rawClient, '/accounts/current', 'patch'),
    read: allpeepNoPayloadEndpoint<PublicAccount>(
      rawClient,
      '/accounts/current',
    ),
    createPushSubscription: allpeepPayloadEndpoint<
      PushSubscription,
      PushSubscriptionData
    >(rawClient, '/accounts/current/push-subscriptions'),
    listPushSubscriptions: allpeepNoPayloadEndpoint<PushSubscription[]>(
      rawClient,
      '/accounts/current/push-subscriptions',
    ),
    testPushSubscription: allpeepPayloadEndpoint<
      SuccessResponse,
      { subscriptionKey: string }
    >(rawClient, '/accounts/current/push-subscriptions/test'),
    validationEmail: allpeepNoPayloadEndpoint<SuccessResponse>(
      rawClient,
      '/accounts/current/validation-email',
      'post',
    ),
    deletePushSubcription: allpeepNoPayloadEndpoint<SuccessResponse, { pushSubscriptionId: string }>(
      rawClient,
      '/accounts/current/push-subscriptions/:pushSubscriptionId',
      'delete',
    ),
  },
});
