import type { OpenpeepsClient } from '@openpeeps/client';
import { apiHook, noPayloadMutation } from '../helpers';

export type PaymentHooks = ReturnType<typeof paymentHooks>;

export const paymentHooks = (client: OpenpeepsClient) => ({
  usePaymentStatus: (options?: { enabled?: boolean }) =>
    apiHook(client.payments.status, options),
  createCustomerPortalAction: noPayloadMutation(client.payments.createPortal, [
    ['payments'],
  ]),
  createCheckoutAction: noPayloadMutation(client.payments.createCheckout, [
    ['payments'],
  ]),
});
