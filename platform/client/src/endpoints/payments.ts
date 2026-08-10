import type { FetchClient } from '@openpeepshq/fetch-client';
import type {
  PaymentCheckoutResponse,
  StripeCustomerPortalResponseSchema,
  StripeSubscriptionData,
  SuccessFailureResponse,
  StripePaymentConfig,
} from '@openpeepshq/common';
import { allpeepNoPayloadEndpoint, allpeepPayloadEndpoint } from './helpers';

export const payments = (rawClient: FetchClient) => ({
  createCheckout: allpeepNoPayloadEndpoint<PaymentCheckoutResponse>(
    rawClient,
    '/payments/create-checkout',
    'post',
  ),
  createPortal: allpeepNoPayloadEndpoint<StripeCustomerPortalResponseSchema>(
    rawClient,
    '/payments/create-portal',
    'post',
  ),
  success: allpeepNoPayloadEndpoint<SuccessFailureResponse>(
    rawClient,
    '/payments/success',
  ),
  status: allpeepNoPayloadEndpoint<StripeSubscriptionData>(
    rawClient,
    '/payments/status',
  ),
  test: allpeepPayloadEndpoint<SuccessFailureResponse, StripePaymentConfig>(
    rawClient,
    '/payments/test',
  ),
});
