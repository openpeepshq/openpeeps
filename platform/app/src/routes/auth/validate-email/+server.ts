import { error, redirect, type RequestHandler } from '@sveltejs/kit';
import { validateEmail } from '@openpeeps/core/accounts';

export const GET: RequestHandler = async (event) => {
  const token = event.url.searchParams.get('token');

  if (!token) {
    error(404);
  }

  const success = validateEmail(token);

  if (!success) {
    error(403);
  }

  redirect(307, '/?toast=success');
};
