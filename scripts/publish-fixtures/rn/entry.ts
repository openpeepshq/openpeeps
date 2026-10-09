import { handleRegex } from '@openpeepshq/common';
import { z } from '@openpeepshq/common/zod';

export const schema = z.object({
  handle: z.string().regex(handleRegex),
});
