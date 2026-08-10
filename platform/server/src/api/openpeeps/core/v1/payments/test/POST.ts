import { endpoint, z } from '#lib/endpoint';
import { forbidden, notFound } from '#lib/errors';
import {
  successFailureResponseSchema,
  stripePaymentConfigSchema,
} from '@openpeepshq/common/types';
import { testStripeCredentials } from '@openpeepshq/core/stripe';

export const Input = stripePaymentConfigSchema();
export const Output = successFailureResponseSchema;

export const Error = {
  403: forbidden(),
  404: notFound(),
};

export const apiEndpoint = endpoint({ Input, Output, Error }).handle(async (input) =>
  testStripeCredentials(input),
);
