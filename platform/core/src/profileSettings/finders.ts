import { getProfileSettings } from './cache';

export const findProfileSettings = (id: string) => getProfileSettings(id);
