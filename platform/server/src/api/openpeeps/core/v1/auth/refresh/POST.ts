import { endpoint } from '#lib/endpoint';
import type { RequestEvent } from '@riddl/core';
import { tokenResponseSchema } from '@openpeeps/common/types';
import { refreshAuthTokenHandler } from '#lib/handlers/auth/refresh';
import { authNeeded, forbidden } from '#lib/errors';

export const Output = tokenResponseSchema;

export const Error = {
  403: forbidden(),
  401: authNeeded(),
};

export const apiEndpoint = endpoint({ Output, Error }).handle(
  async (_input, event: RequestEvent) => refreshAuthTokenHandler(event),
);
