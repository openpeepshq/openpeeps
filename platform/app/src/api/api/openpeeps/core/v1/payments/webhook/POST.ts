import { Endpoint, z } from 'sveltekit-api';
import { forbidden, notFound } from '$lib/server/api/errors';
import type { RequestEvent } from '@sveltejs/kit';
import {
  getStripe,
  processEvent,
  getStripeDetails,
  stripeMembershipActive,
} from '@openpeeps/core/stripe';

export const Error = {
  403: forbidden(),
  404: notFound(),
};
export const Output = z.object({ received: z.boolean() });

export default new Endpoint({ Output, Error }).handle(
  async (_, event: RequestEvent) => {
    if (!(await stripeMembershipActive())) {
      throw forbidden();
    }
    const body = await event.request.text();
    const signature = event.request.headers.get('Stripe-Signature');
    if (!signature) {
      throw forbidden();
    }

    async function doEventProcessing() {
      const details = await getStripeDetails();
      if (!details?.webhookSecret) {
        throw forbidden('[STRIPE HOOK] No details found');
      }

      if (typeof signature !== 'string') {
        throw forbidden("[STRIPE HOOK] Header isn't a string???");
      }

      const event = await getStripe().then(stripe => stripe.webhooks.constructEvent(
        body,
        signature,
        details.webhookSecret!,
      ));

      await processEvent(event);
    }
    try {
      await doEventProcessing();
      return { received: true };
    } catch (error) {
      if (error) {
        console.error('[STRIPE HOOK] Error processing event', error);
      }
      return { received: false };
    }
  },
);
