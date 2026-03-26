import * as Sentry from '@sentry/sveltekit';
import type { HandleClientError, ClientInit } from '@sveltejs/kit';
import { registerNotificationComponents } from '@openpeeps/svelte/components';

export const handleError: HandleClientError = Sentry.handleErrorWithSentry(
  async ({ message }) => {
    //TODO: think about error architecture
    //const errorId = crypto.randomUUID();

    return { message };
  },
);

export const init: ClientInit = async () => {
  registerNotificationComponents();
};
