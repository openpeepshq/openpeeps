import { client, noPayloadMutation, simpleStore, payloadMutation } from './helpers';

export const createCheckoutMutation = noPayloadMutation(client.payments.createCheckout);
export const createCustomerPortalMutation = noPayloadMutation(client.payments.createPortal);
export const testPaymentMutation = payloadMutation(client.payments.test);

export const checkPaymentSuccess = () =>
	simpleStore(client.payments.success, {
		refetchInterval: 2000,
	});
export const checkPaymentStatus = () => simpleStore(client.payments.status);
