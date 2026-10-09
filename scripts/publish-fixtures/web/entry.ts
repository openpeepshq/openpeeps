import { z } from '@openpeepshq/common/zod';
import { handleRegex } from '@openpeepshq/common';

export const schema = z.object({
  handle: z.string().regex(handleRegex),
});
