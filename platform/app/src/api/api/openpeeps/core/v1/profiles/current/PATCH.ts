import { Endpoint } from 'sveltekit-api';
import {
  updateProfileRequestSchema,
  profileWithMetaSchema,
} from '@openpeeps/common/types';
import { forbidden, notFound } from '$lib/server/api/errors';
import { updateCurrentProfileHandler } from '$lib/server/api/handlers/profile/updateCurrent';

export const Input = updateProfileRequestSchema;
export const Output = profileWithMetaSchema;

export const Error = {
  403: forbidden(),
  404: notFound(),
};

export default new Endpoint({ Input, Output, Error }).handle(
  updateCurrentProfileHandler,
);
