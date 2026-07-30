/**
 * `Response`-based error helpers for middleware paths that return a Response
 * directly (rather than throw an `HttpError`).
 */

const json = (
  body: Record<string, unknown>,
  init: ResponseInit = {},
): Response =>
  new Response(JSON.stringify(body), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });

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
  message: string | Error = 'Invalid request',
) => {
  const messageText = message instanceof Error ? message.message : message;
  return json({ success: false, message: messageText }, { status: 422 });
};
export const internalError = (message = 'Internal error') =>
  json({ success: false, message }, { status: 500 });
