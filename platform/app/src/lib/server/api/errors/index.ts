import { error } from 'sveltekit-api';
import type { OpenpeepsError } from '@openpeeps/common/types';

export const badRequest = (message = 'Bad request') => error(400, message);
export const authNeeded = (message = 'Authentication needed') =>
  error(401, message);
export const forbidden = (message = 'Forbidden') => error(403, message);
export const notFound = (target?: string) =>
  error(404, target ? `${target} not found` : 'Not found');
export const conflict = (message = 'Conflict') => error(409, message);
export const unprocessableRequest = (message = 'Invalid request') =>
  error(422, message);
export const internalError = (message = 'Internal error') =>
  error(500, message);
export const fromOpenpeepsError = (allPeepError: OpenpeepsError) =>
  error(allPeepError.code || 500, allPeepError.errorKey);
