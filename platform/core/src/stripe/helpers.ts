import type Stripe from 'stripe';
import { config } from '@openpeepshq/core/config';
import type {
  AccountWithMeta,
  ProfileWithMeta,
  StripePaymentConfig,
} from '@openpeepshq/common/types';
import {
  getStripeCustomerId,
  isOwnerProfile,
  isStripeActive,
} from '@openpeepshq/common/lib';
import {
  getUserStripeSubscription,
  refreshStripeSubscription,
  stripeCache,
} from './cache';
import { findProfileSettings, updateProfileSettings } from '../profileSettings';
import { getStripe, initStripeWithCredentials } from './connection';

export const getStripeDetails = async () => {
  const cfg = await config();
  const data = cfg.payments?.stripe;
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
  const success_url = `${protocol}://${cfg.server.host}/payment/success`;
  const cancel_url = `${protocol}://${cfg.server.host}/auth/login`;
  const portal_return_url = `${protocol}://${cfg.server.host}/settings/billing`;
  return { ...data, success_url, cancel_url, portal_return_url };
};

export const stripeMembershipActive = async () => {
  const data = await getStripeDetails();
  return !!data?.paidMembership?.enabled;
};

const getPrices = async (stripeInstance: Stripe, productId = '', limit = 1) => {
  if (!productId) {
    throw new Error('[STRIPE_PRICE][ERROR] No productId found');
  }
  const product = await stripeInstance.products.retrieve(productId, {
    expand: ['default_price'],
  });
  if (!product) {
    throw new Error('[STRIPE_PRICE][ERROR] No product found');
  }
  const defaultPriceId =
    typeof product.default_price === 'string'
      ? product.default_price
      : (product.default_price?.id ?? null);

  if (defaultPriceId && limit === 1) {
    try {
      const price = await stripeInstance.prices.retrieve(defaultPriceId);
      return { data: [price] as Stripe.Price[] };
    } catch {
      return { data: [] as Stripe.Price[] };
    }
  }

  return await stripeInstance.prices
    .list({
      product: product.id,
      limit,
    })
    .then((res) => res)
    .catch(() => ({ data: [] as Stripe.Price[] }));
};

export const testStripeCredentials = async (data: StripePaymentConfig) => {
  try {
    const credentials = { ...(await getStripeDetails())!, ...data };
    const stripe = initStripeWithCredentials(credentials);
    if (!stripe) {
      return {
        success: false,
        key: 'configuration.server.stripe.errors.invalidCredentials',
      };
    }
    const { paidMembership } = credentials;
    const productId = paidMembership?.productId;
    if (!productId) {
      return {
        success: false,
        key: 'configuration.server.stripe.errors.noProductId',
      };
    }
    const prices = await getPrices(stripe, paidMembership?.productId, 1);
    if (prices.data.length === 0) {
      return {
        success: false,
        key: 'configuration.server.stripe.errors.noActivePrice',
      };
    }
    return { success: true, key: 'configuration.server.stripe.success.test' };
  } catch (e) {
    return { success: false, key: 'configuration.server.stripe.errors.failed' };
  }
};

export const createStripeCustomerPortal = async (stripeId: string) => {
  if (!stripeId) {
    return;
  }
  const { portal_return_url } = (await getStripeDetails())!;
  try {
    const session = await getStripe().then((stripe) =>
      stripe.billingPortal.sessions.create({
        customer: stripeId,
        return_url: portal_return_url,
      }),
    );
    return session.url;
  } catch {}
};

export const createStripeCustomer = async (
  profile: ProfileWithMeta,
  account: AccountWithMeta,
) => {
  const profileSettings = await findProfileSettings(profile.id);
  let stripeCustomerId = getStripeCustomerId(profileSettings);
  if (!stripeCustomerId) {
    const customer = await getStripe().then((stripe) =>
      stripe.customers.create({
        email: account.email,
        metadata: {
          userId: profile.id,
        },
      }),
    );
    await updateProfileSettings(profile.id, {
      stripeSettings: {
        customerId: customer.id,
      },
    });
    stripeCustomerId = customer.id;
  }
  return stripeCustomerId!;
};

const allowedEvents: Stripe.Event.Type[] = [
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'customer.subscription.paused',
  'customer.subscription.resumed',
  'customer.subscription.pending_update_applied',
  'customer.subscription.pending_update_expired',
  'customer.subscription.trial_will_end',
  'invoice.paid',
  'invoice.payment_failed',
  'invoice.payment_action_required',
  'invoice.upcoming',
  'invoice.marked_uncollectible',
  'invoice.payment_succeeded',
  'payment_intent.succeeded',
  'payment_intent.payment_failed',
  'payment_intent.canceled',
];

export const processEvent = async (event: Stripe.Event) => {
  if (!allowedEvents.includes(event.type)) return;

  const { customer: customerId } = event?.data?.object as {
    customer: string;
  };

  if (typeof customerId !== 'string') {
    throw new Error(
      `[STRIPE HOOK][CANCER] ID isn't string.\nEvent type: ${event.type}`,
    );
  }

  return stripeCache.del(customerId);
};

const getOrCreateStripeCustomerId = async (
  profile: ProfileWithMeta,
  account: AccountWithMeta,
): Promise<string | undefined> =>
  getStripeCustomerId(await findProfileSettings(profile.id)) ||
  (await createStripeCustomer(profile, account));

export const checkSubscription = async (
  profile?: ProfileWithMeta,
  account?: AccountWithMeta,
  refresh = false,
): Promise<boolean> => {
  if (
    (await stripeMembershipActive()) &&
    profile &&
    profile.type === 'local' &&
    !isOwnerProfile(profile)
  ) {
    if (!account) {
      return false;
    }
    const stripeCustomerId = await getOrCreateStripeCustomerId(
      profile,
      account,
    );
    if (!stripeCustomerId) {
      return false;
    }
    const subscription = refresh
      ? await refreshStripeSubscription(stripeCustomerId)
      : await getUserStripeSubscription(stripeCustomerId);
    if (!isStripeActive(subscription)) {
      return false;
    }
  }
  return true;
};

export const createStripeCheckoutUrl = async (
  profile: ProfileWithMeta,
  account: AccountWithMeta,
): Promise<string | undefined> => {
  const stripeCustomerId = await getOrCreateStripeCustomerId(profile, account);
  if (!stripeCustomerId) {
    throw new Error('[STRIPE_CHECKOUT][ERROR] No stripe customer id found');
  }
  const { paidMembership, success_url, cancel_url } =
    (await getStripeDetails())!;
  const productId = paidMembership?.productId;
  const trialPeriodDays = paidMembership?.trialPeriodDays ?? 0;
  const prices = await getPrices(await getStripe(), productId, 1);
  const line_items = prices.data.map((price) => ({
    price: price.id,
    quantity: 1,
  }));
  if (line_items.length === 0) {
    throw new Error(
      `[STRIPE_PRICE][ERROR] No active prices found for product ${productId}`,
    );
  }
  try {
    const res = await getUserStripeSubscription(stripeCustomerId);
    let successUrl = success_url;
    if (res !== null && res?.status !== 'none') {
      successUrl = `${success_url}?user=true`;
    }
    const subscription_data =
      trialPeriodDays > 0
        ? {
            trial_period_days: trialPeriodDays,
          }
        : undefined;
    return getStripe()
      .then((stripe) =>
        stripe.checkout.sessions.create({
          customer: stripeCustomerId,
          success_url: successUrl,
          cancel_url,
          line_items,
          mode: 'subscription',
          client_reference_id: profile.id,
          subscription_data,
          allow_promotion_codes: true,
        }),
      )
      .then((session) => session.url ?? undefined);
  } catch {}
};
