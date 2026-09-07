import type { ProfileSettings } from '@openpeepshq/common/types';
import { getProfileSettings } from './cache';
import { toPublicProfileSettings } from './mapping';

export const findProfileSettings = async (
  id: string,
): Promise<ProfileSettings> =>
  toPublicProfileSettings(await getProfileSettings(id));
