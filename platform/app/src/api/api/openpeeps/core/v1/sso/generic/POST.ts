import { Endpoint, z } from 'sveltekit-api';
import { tokenResponseSchema } from '@openpeeps/common/types';
import { forbidden, notFound } from '$lib/server/api/errors';
import { handle } from '$lib/server/api/handlers/sso/generic';

export const Input = z.object({ data: z.record(z.string(), z.string()) });
export const Output = tokenResponseSchema;

export const Error = {
  403: forbidden(),
  404: notFound(),
};

export default new Endpoint({ Input, Output, Error }).handle((input) =>
  handle(input.data),
);
