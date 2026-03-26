import { Endpoint } from 'sveltekit-api';
import type { RequestEvent } from '@sveltejs/kit';
import { profileSettingsSchema } from '@openpeeps/common/types';
import { ensureLocalProfile, ensureProfileOrGuest } from '$lib/server/auth';
import { authNeeded, forbidden } from '$lib/server/api/errors';
import { findProfileSettings } from '@openpeeps/core/profileSettings';

export const Output = profileSettingsSchema.optional();

export const Error = {
  401: authNeeded(),
  403: forbidden(),
};

export default new Endpoint({ Output, Error }).handle(
  (_, event: RequestEvent) => ensureProfileOrGuest(event).then((profile) => findProfileSettings(profile?.id ?? ''))
);
