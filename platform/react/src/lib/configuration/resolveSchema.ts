import type { ZodObject, ZodRawShape } from 'zod';
import {
  capabilitiesConfigSchema,
  communityConfigSanitizedSchema,
  coreConfigSanitizedSchema,
} from '@openpeepshq/common/types';

const configSchemas: Record<string, ZodObject<ZodRawShape>> = {
  'openpeeps-core': coreConfigSanitizedSchema,
  'openpeeps-community': communityConfigSanitizedSchema,
  'openpeeps-capabilities': capabilitiesConfigSchema,
};

/** Client-side schemas registered in `@openpeepshq/core` config (mirrors Svelte admin). */
export const resolveAdminConfigSchema = (
  namespace: string,
  name: string,
): ZodObject<ZodRawShape> | undefined => configSchemas[`${namespace}-${name}`];
