import { endpoint } from '#lib/endpoint';
import { tokenResponseSchema } from '@openpeeps/common/types';
import { conflict, forbidden } from '#lib/errors';
import { config } from '@openpeeps/core/config';
import { createGuestPass } from '@openpeeps/core/auth';
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

export const apiEndpoint = endpoint({ Input, Output, Error }).handle(
  async (guestPassRequest) => {
    const {
      server: { publicContent },
    } = await config();

    if (!publicContent) {
      const { resource } = guestPassRequest;
      if (resource.type !== 'jam' || resource.id === '*') {
        throw forbidden();
      }
      const post = await findPost(resource.id);
      if (!post || post.type !== 'event' || post.visibility !== 'public') {
        throw forbidden();
      }
    }

    const profile = await createGuestProfile(guestPassRequest);

    const authorization = createGuestPass(profile);
    const jwt = await jwtUtil();
    const token = await jwt.sign(authorization);

    return {
      success: true,
      token,
    };
  },
);
