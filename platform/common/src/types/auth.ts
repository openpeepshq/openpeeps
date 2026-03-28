import { z } from 'zod';
import { scopeSchema } from './models';

export const identitySchema = z.object({
  type: z.enum([
    'current-profile',
    'local',
    'activity-pub',
    'guest-profile',
    'service',
  ]),
  id: z.string().uuid(),
});
export type Identity = z.infer<typeof identitySchema>;

export const authorizationSchema = z.object({
  identities: z.array(identitySchema),
  scopes: z.array(scopeSchema),
});
export type Authorization = z.infer<typeof authorizationSchema>;
