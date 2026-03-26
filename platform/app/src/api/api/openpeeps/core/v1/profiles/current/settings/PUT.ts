import { Endpoint } from 'sveltekit-api';
import type { RequestEvent } from '@sveltejs/kit';
import { ensureLocalProfile } from '$lib/server/auth';
import { profileSettingsDataSchema, profileSettingsSchema } from '@openpeeps/common/types';
import { updateProfileSettings } from '@openpeeps/core/profileSettings';

export const Output = profileSettingsSchema;
export const Input = profileSettingsDataSchema;

export default new Endpoint({ Output, Input }).handle(
  async (input, event: RequestEvent) => {
    const currentProfile = await ensureLocalProfile(event);

    return updateProfileSettings(currentProfile.id, input);
  },
);
