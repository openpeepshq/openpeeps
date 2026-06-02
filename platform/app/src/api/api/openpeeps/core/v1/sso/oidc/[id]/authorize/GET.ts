import { Endpoint, z } from 'sveltekit-api';
import { authNeeded, forbidden, notFound } from '$lib/server/api/errors';
import { authorize } from '$lib/server/api/handlers/sso/oidc';

export const Param = z.object({
  id: z.string(),
});

export const Output = z.object({
  data: z.object({
    redirectUrl: z.string(),
  }),
});

export const Error = {
  400: forbidden(),
  404: notFound(),
};

export default new Endpoint({ Param, Output, Error }).handle(async (param) => {
  const url = await authorize(param.id, {})
    .catch((err: Error) => {
      throw authNeeded(err.message);
    });

  return { data: { redirectUrl: url.toString() } };
});
