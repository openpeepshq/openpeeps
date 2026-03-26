import { Endpoint, z } from 'sveltekit-api';
import { forbidden, notFound } from '$lib/server/api/errors';
import {
  successFailureResponseSchema,
  stripePaymentConfigSchema,
} from '@openpeeps/common/types';
import { testStripeCredentials } from '@openpeeps/core/stripe';

export const Input = stripePaymentConfigSchema();
export const Output = successFailureResponseSchema;

export const Error = {
  403: forbidden(),
  404: notFound(),
};

export default new Endpoint({ Input, Output, Error }).handle(async (input) =>
  testStripeCredentials(input),
);
