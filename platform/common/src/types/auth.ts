import { z } from 'zod';
import { resourceSchema } from './models';

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

export const scopeSchema = z.object({
  scope: z.enum(['write', 'read', 'admin']).optional(),
  resource: resourceSchema,
});
export type Scope = z.infer<typeof scopeSchema>;

export const authorizationSchema = z.object({
  identities: z.array(identitySchema),
  scopes: z.array(scopeSchema),
});
export type Authorization = z.infer<typeof authorizationSchema>;
