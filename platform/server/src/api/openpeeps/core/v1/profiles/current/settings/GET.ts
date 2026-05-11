import { endpoint } from '#lib/endpoint';
import type { RequestEvent } from '@riddl/core';
import { profileSettingsSchema } from '@openpeeps/common/types';
import { ensureLocalProfile, ensureProfileOrGuest } from '#lib/auth';
import { authNeeded, forbidden } from '#lib/errors';
import { findProfileSettings } from '@openpeeps/core/profileSettings';

export const Output = profileSettingsSchema.optional();

export const Error = {
  401: authNeeded(),
  403: forbidden(),
};

export const apiEndpoint = endpoint({ Output, Error }).handle(
  (_, event: RequestEvent) => ensureProfileOrGuest(event).then((profile) => findProfileSettings(profile?.id ?? ''))
);
