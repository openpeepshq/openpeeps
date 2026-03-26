import { error } from '@sveltejs/kit';

export const load = () => {
  throw error(500, {
    message: 'Internal server error',
  });
};
