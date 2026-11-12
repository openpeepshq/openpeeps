import { endpoint } from '#lib/endpoint';
import type { RequestEvent } from '@riddl/core';
import { ensureLocalProfile, ensureScope } from '#lib/auth';
import {
  profileSettingsDataSchema,
  profileSettingsSchema,
} from '@openpeepshq/common/types';
import { updateProfileSettings } from '@openpeepshq/core/profileSettings';

export const Output = profileSettingsSchema;
export const Input = profileSettingsDataSchema;

export const apiEndpoint = endpoint({ Output, Input }).handle(
  async (input, event: RequestEvent) => {
    const currentProfile = await ensureLocalProfile(event);
    await ensureScope(event, 'write', {
      type: 'profiles',
      id: currentProfile.id,
    });

    return updateProfileSettings(currentProfile.id, input);
  },
);
