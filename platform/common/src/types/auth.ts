import { z } from 'zod';
import { accountWithMetaSchema, scopeSchema } from './models';
import { profileWithMetaSchema } from './internal';

export const authorizationSchema = z.object({
  identities: z.object({
    profile: z.string().optional(),
    account: z.string().optional(),
    service: z.string().optional(),
  }),
  scopes: z.array(scopeSchema),
});
export type Authorization = z.infer<typeof authorizationSchema>;

export const authorizationDataSchema = z.object({
  profile: profileWithMetaSchema.optional(),
  account: accountWithMetaSchema.optional(),
  service: z.string().optional(),
  scopes: z.array(scopeSchema),
})

export type AuthorizationData = z.infer<typeof authorizationDataSchema>;