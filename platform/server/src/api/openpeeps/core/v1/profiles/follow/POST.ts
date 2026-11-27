import { endpoint } from '#lib/endpoint';
import { followDataSchema } from '@openpeepshq/common/types';
import { successResponseSchema } from '@openpeepshq/common/types';
import { forbidden, notFound } from '#lib/errors';
import { followProfileHandler } from '#lib/handlers/profile/follow';

// Follow by remote handle (#241). Unlike `profiles/[profileId]/follow`, this
// carries no path profileId — the target is `input.handle` (a `user@domain`
// / `@user@domain` handle or an `https` actor URL), resolved over
// ActivityPub before the follow is created.
export const Input = followDataSchema;
export const Output = successResponseSchema;

export const Error = {
  403: forbidden(),
  404: notFound(),
};

export const apiEndpoint = endpoint({ Input, Output, Error }).handle(
  followProfileHandler,
);
