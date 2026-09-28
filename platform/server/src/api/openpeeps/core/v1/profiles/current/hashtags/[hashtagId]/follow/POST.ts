import { endpoint } from '#lib/endpoint';
import { successResponseSchema } from '@openpeepshq/common/types';
import { forbidden, notFound } from '#lib/errors';
import {
  followHashtagHandler,
  hashtagParamSchema,
} from '#lib/handlers/hashtags/hashtagFollows';

export const Param = hashtagParamSchema;
export const Output = successResponseSchema;

export const Error = {
  403: forbidden(),
  404: notFound(),
};

export const apiEndpoint = endpoint({ Param, Output, Error }).handle(
  followHashtagHandler,
);
