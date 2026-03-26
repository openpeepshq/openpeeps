import { json } from '@sveltejs/kit';
import { z } from 'sveltekit-api';

const { ZodError } = z;

export const authNeeded = (message = 'Authentication needed') =>
  json({ success: false, message }, { status: 401 });
export const forbidden = (message = 'Forbidden') =>
  json({ success: false, message }, { status: 403 });
export const notFound = (target?: string) =>
  json(
    { success: false, message: target ? `${target} not found` : 'Not found' },
    { status: 404 },
  );
export const conflict = (message = 'Conflict') =>
  json({ success: false, message }, { status: 409 });
export const unprocessableRequest = (
  error: typeof ZodError | string = 'Invalid request',
) => {
  const message = error instanceof ZodError ? error.message : error;
  return json({ success: false, message }, { status: 422 });
};
export const internalError = (message = 'Internal error') =>
  json({ success: false, message }, { status: 500 });
