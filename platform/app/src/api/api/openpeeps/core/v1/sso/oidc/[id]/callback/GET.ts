import { Endpoint, z } from 'sveltekit-api';
import type { RequestEvent } from '@sveltejs/kit';
import { forbidden, notFound } from '$lib/server/api/errors';
import { callback as oidcCallback } from '$lib/server/api/handlers/sso/oidc';

export const Param = z.object({
  id: z.string(),
});

export const Output = z.object({
  success: z.literal(true),
  token: z.string(),
}).or(z.object({
  success: z.literal(false),
  token: z.string(),
  error: z.string().optional(),
  redirectState: z.string().optional(),
  redirectUrl: z.string().optional(),
}));

export const Error = {
  400: forbidden(),
  404: notFound(),
};

export default new Endpoint({ Param, Output, Error }).handle(
  async (param, event: RequestEvent) => {
    const paramsObj = Object.fromEntries(
      new URL(event.request.url).searchParams.entries(),
    );

    const result = await oidcCallback(param.id, paramsObj);

    return result;
  },
);
