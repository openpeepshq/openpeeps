import type { SuccessResponse } from '@openpeeps/common/types';
import { validateEmail } from '@openpeeps/core/accounts';
import { badRequest } from '#lib/errors';

export const validateEmailHandler = async (input: {
  token: string;
}): Promise<SuccessResponse> => {
  const success = await validateEmail(input.token);
  if (!success) {
    throw badRequest('Invalid or expired validation token');
  }
  return { success: true };
};
