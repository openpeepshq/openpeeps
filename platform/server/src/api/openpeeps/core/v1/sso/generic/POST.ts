import { endpoint, z } from '#lib/endpoint';
import { tokenResponseSchema } from '@openpeepshq/common/types';
import { forbidden, notFound } from '#lib/errors';
import { handle } from '#lib/handlers/sso/generic';

export const Input = z.object({ data: z.record(z.string(), z.string()) });
export const Output = tokenResponseSchema;

export const Error = {
  403: forbidden(),
  404: notFound(),
};

export const apiEndpoint = endpoint({ Input, Output, Error }).handle((input) =>
  handle(input.data),
);
