import { endpoint } from '#lib/endpoint';
import { tokenResponseSchema } from '@openpeepshq/common/types';
import { conflict, forbidden } from '#lib/errors';
import { config } from '@openpeepshq/core/config';
import { createSignedGuestPass } from '@openpeepshq/core/accessTokens';
import { guestPassRequestSchema } from '@openpeepshq/common/types';
import { createGuestProfile } from '@openpeepshq/core/profiles';
import { findPost } from '@openpeepshq/core/posts';

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
