import { StripePaymentConfig } from '@openpeeps/common/types';
import Stripe from 'stripe';
import { config } from '../config';
import { hub } from '../events';

export const initStripeWithCredentials = (data: StripePaymentConfig) =>
  data?.publishableKey || data?.secretKey || data?.webhookSecret
    ? new Stripe(data?.secretKey!, { apiVersion: '2025-07-30.basil' })
    : undefined;

export const initStripe = async () => {
  hub.on('configUpdated', (namespace: string, name: string) => {
    if (namespace === 'openpeeps' && name === 'core') {
      _stripe = null;
    }
  });
  const cfg = await config();
  return initStripeWithCredentials(cfg.payments?.stripe);
};

let _stripe: Stripe | null = null;

export const getStripe = async () => {
  if (!_stripe) {
    _stripe = (await initStripe())!;
  }
  return _stripe;
};
