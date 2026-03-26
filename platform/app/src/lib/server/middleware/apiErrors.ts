import type { Handle } from '@sveltejs/kit';
import { z } from 'sveltekit-api';
import { internalError, unprocessableRequest } from '$lib/server/helpers';

const { ZodError } = z;

export const handleApiErrors: Handle = async ({ resolve, event }) => {
  if (event.url.pathname.startsWith('/api')) {
    try {
      return await resolve(event);
    } catch (e) {
      if (e instanceof ZodError) {
        return unprocessableRequest(e as unknown as typeof ZodError);
      }

      return internalError();
    }
  }

  return resolve(event);
};
