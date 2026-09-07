import { endpoint } from '#lib/endpoint';
import type { RequestEvent } from '@riddl/core';
import { ensureLocalProfile } from '#lib/auth';
import {
  profileSettingsSchema,
  profileSettingsUpdateDataSchema,
} from '@openpeepshq/common/types';
import { updateProfileSettings } from '@openpeepshq/core/profileSettings';

export const Output = profileSettingsSchema;
export const Input = profileSettingsUpdateDataSchema;

export const apiEndpoint = endpoint({ Output, Input }).handle(
  async (input, event: RequestEvent) => {
    const currentProfile = await ensureLocalProfile(event);

    return updateProfileSettings(currentProfile.id, input);
  },
);
