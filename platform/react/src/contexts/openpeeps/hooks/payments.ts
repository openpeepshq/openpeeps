import type { OpenpeepsClient } from '@openpeeps/client';
import { apiHook, noPayloadMutation } from '../helpers';

export type PaymentHooks = ReturnType<typeof paymentHooks>;

export const paymentHooks = (client: OpenpeepsClient) => ({
  usePaymentStatus: () => apiHook(client.payments.status),
  createCustomerPortalAction: noPayloadMutation(client.payments.createPortal, [
    ['payments'],
  ]),
  createCheckoutAction: noPayloadMutation(client.payments.createCheckout, [
    ['payments'],
  ]),
});
