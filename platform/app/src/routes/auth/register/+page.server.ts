import { config } from '@openpeeps/core/config';
import { redirect } from '@sveltejs/kit';

export async function load() {
  const {
    server: { signUpsOpen },
  } = await config();

  if (!signUpsOpen) {
    throw redirect(307, '/auth/closed');
  }
}
