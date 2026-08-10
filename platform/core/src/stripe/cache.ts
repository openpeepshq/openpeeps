import { StripeSubscriptionData } from '@openpeepshq/common/types';
import { getStripe } from './connection';

export const STRIPE_CACHE_KEY = 'stripe-customer-sub:';

import { createCache } from 'cache-manager';

export const stripeCache = createCache({
  ttl: 60 * 60 * 1000 * 24,
  refreshThreshold: 60 * 60 * 1000,
});

const loadStripeSubscription = async (
  customerId: string,
): Promise<StripeSubscriptionData> => {
  const subscriptions = await getStripe().then((stripe) =>
    stripe.subscriptions.list({
      customer: customerId,
      limit: 1,
      status: 'all',
      expand: ['data.default_payment_method'],
    }),
  );

  if (!subscriptions?.data || subscriptions?.data.length === 0) {
    return { status: 'none' };
  }

  const subscription = subscriptions.data[0];

  return {
    subscriptionId: subscription.id,
    status: subscription.status,
    priceId: subscription.items.data[0].price.id,
    currentPeriodEnd: subscription.ended_at ?? null,
    currentPeriodStart: subscription.start_date ?? null,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    paymentMethod:
      subscription.default_payment_method &&
      typeof subscription.default_payment_method !== 'string'
        ? {
            brand: subscription.default_payment_method.card?.brand ?? null,
            last4: subscription.default_payment_method.card?.last4 ?? null,
          }
        : null,
  };
};

export const getUserStripeSubscription = async (customerId: string) =>
  stripeCache.wrap(customerId, async () => loadStripeSubscription(customerId));

export const refreshStripeSubscription = async (customerId: string) =>
  stripeCache.del(customerId).then(() => getUserStripeSubscription(customerId));
