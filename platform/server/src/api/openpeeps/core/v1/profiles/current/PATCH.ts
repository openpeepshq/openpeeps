import { endpoint } from '#lib/endpoint';
import {
  updateProfileRequestSchema,
  profileWithMetaSchema,
} from '@openpeeps/common/types';
import { forbidden, notFound } from '#lib/errors';
import { updateCurrentProfileHandler } from '#lib/handlers/profile/updateCurrent';

export const Input = updateProfileRequestSchema;
export const Output = profileWithMetaSchema;

export const Error = {
  403: forbidden(),
  404: notFound(),
};

export const apiEndpoint = endpoint({ Input, Output, Error }).handle(
  updateCurrentProfileHandler,
);
