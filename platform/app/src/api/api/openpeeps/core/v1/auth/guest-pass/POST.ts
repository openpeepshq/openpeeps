import { Endpoint } from 'sveltekit-api';
import { tokenResponseSchema } from '@openpeeps/common/types';
import { conflict, forbidden } from '$lib/server/api/errors';
import { config } from '@openpeeps/core/config';
import { createSignedGuestPass } from '@openpeeps/core/accessTokens';
import { jwtUtil } from '@openpeeps/core/jwt';
import { guestPassRequestSchema } from '@openpeeps/common/types';
import { createGuestProfile } from '@openpeeps/core/profiles';
import { findPost } from '@openpeeps/core/posts';

export const Input = guestPassRequestSchema;
export const Output = tokenResponseSchema;

export const Error = {
  409: conflict(),
  403: forbidden(),
};

export default new Endpoint({ Input, Output, Error }).handle(
  async (guestPassRequest) => {
    const {
      server: { publicContent },
    } = await config();

    if (!publicContent) {
      const { resource } = guestPassRequest;
      if (resource.type !== 'jams' || !resource.id || resource.id === '*') {
        throw forbidden();
      }
      const post = await findPost(resource.id);
      if (!post || post.type !== 'event' || post.visibility !== 'public') {
        throw forbidden();
      }
    }

    const profile = await createGuestProfile(guestPassRequest);

    const guestPass = await createSignedGuestPass(profile);

    return {
      success: true,
      token: guestPass.signedToken,
    };
  },
);
