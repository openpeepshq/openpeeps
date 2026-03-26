import { z } from 'zod';
import { successFailureResponseSchema } from './api';

export const stripeSubscriptionStatusSchema = z.enum([
  'incomplete',
  'incomplete_expired',
  'trialing',
  'active',
  'past_due',
  'canceled',
  'unpaid',
  'paused',
]);

const paymentMethodSchema = z
  .object({
    brand: z.string().nullable(),
    last4: z.string().nullable(),
  })
  .nullable();

export const stripeSubscriptionDataSchema = z.discriminatedUnion('status', [
  z.object({
    subscriptionId: z.string().nullable(),
    status: stripeSubscriptionStatusSchema,
    priceId: z.string().nullable(),
    currentPeriodStart: z.number().nullable(),
    currentPeriodEnd: z.number().nullable(),
    cancelAtPeriodEnd: z.boolean(),
    paymentMethod: paymentMethodSchema,
  }),
  z.object({
    status: z.literal('none'),
  }),
]);

export const stripeCustomerPortalResponseSchema =
  successFailureResponseSchema.extend({
    url: z.string().optional(),
  });

export type StripeSubscriptionData = z.infer<typeof stripeSubscriptionDataSchema>;
export type StripeCustomerPortalResponseSchema = z.infer<
  typeof stripeCustomerPortalResponseSchema
>;
