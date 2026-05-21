import jp from 'jsonpath';
import { interpolate } from '@openpeeps/common/lib';
import { z } from 'sveltekit-api';
import {
  findNewFreeHandle,
  createProfile,
  listProfilesByAccount,
} from '@openpeeps/core/profiles';
import { createAccount, findAccountByEmail } from '@openpeeps/core/accounts';
import {
  type CoreConfig,
  accountCreationDataSchema,
} from '@openpeeps/common/types';
import { config } from '@openpeeps/core/config';
import { authNeeded, forbidden } from '$lib/server/api/errors';
import { uuidv4 } from 'uuidv7';
import type { ProfileData, ProfileWithMeta, TokenResponse } from '@openpeeps/common/types';
import { logger } from '@openpeeps/core/log';
import { createSignedProfileAccessToken } from '@openpeeps/core/accessTokens';

const log = logger('app:sso');

const extractProfileDataFromProfile = async (
  config: CoreConfig['sso']['generic'][number],
  params: Record<string, string>,
  profile: unknown,
  email: string,
): Promise<ProfileData> => {
  const handleSeed =
    (config.userProfilePaths.handle &&
      jp.value(profile, interpolate(config.userProfilePaths.handle, params))) ??
    email.split('@')[0];
  const handle = await findNewFreeHandle(handleSeed);

  const avatar =
    config.userProfilePaths.avatar &&
    jp.value(profile, interpolate(config.userProfilePaths.avatar, params));

  const displayName =
    config.userProfilePaths.displayName &&
    jp.value(profile, interpolate(config.userProfilePaths.displayName, params));

  return {
    handle,
    avatar,
    displayName,
    type: 'local',
  };
};

export const handle = async (
  params: Record<string, string>,
): Promise<TokenResponse> =>
  config().then(async (config) => {
    const errors: string[] = [];

    for (const genericSSOConfig of config.sso.generic) {
      const authHeader = interpolate(
        genericSSOConfig.userProfileRequest.authHeader,
        params,
      );

      const profileResponse = await fetch(
        interpolate(genericSSOConfig.userProfileRequest.url, params),
        {
          headers: {
            Authorization: authHeader,
          },
        },
      );

      if (!profileResponse.ok) {
        log.error(
          { response: await profileResponse.json() },
          'Failed to fetch profile',
        );
        continue;
      }

      const profileJson = await profileResponse.json();

      const email =
        genericSSOConfig.userProfilePaths.email &&
        jp.value(
          profileJson,
          interpolate(genericSSOConfig.userProfilePaths.email, params),
        );

      if (!email || !z.string().email().safeParse(email).success) {
        errors.push(`Email at ${genericSSOConfig.userProfilePaths.email}`);
        continue;
      }

      const existingAccount = await findAccountByEmail(email.toLowerCase());
      if (existingAccount) {
        let profile: ProfileWithMeta = (
          await listProfilesByAccount(existingAccount)
        )[0];
        if (!profile && genericSSOConfig.createProfiles) {
          profile = await createProfile(
            await extractProfileDataFromProfile(
              genericSSOConfig,
              params,
              profileJson,
              email,
            ),
            existingAccount,
          );
        }


        const token = await createSignedProfileAccessToken({ account: existingAccount, profile, name: 'sso', expirationTime: '1w' })
          .then((accessToken) => accessToken.signedToken);

        if (!token) {
          throw forbidden('sso.access-token-creation-failed');
        }

        return {
          success: true,
          token,
        };
      }

      if (!genericSSOConfig.createAccounts) {
        errors.push(`Account with email ${email}`);
        continue;
      }

      const { account, profile } = await createAccount(
        accountCreationDataSchema.parse({
          email,
          password: uuidv4(),
          emailValidated: true,
          profile: await extractProfileDataFromProfile(
            genericSSOConfig,
            params,
            profileJson,
            email,
          ),
        }),
      );

      const token = await createSignedProfileAccessToken({ account, profile, name: 'sso', expirationTime: '1w' })
        .then((accessToken) => accessToken.signedToken);

      if (!token) {
        throw forbidden('sso.access-token-creation-failed');
      }

      return {
        success: true,
        token,
      };
    }

    throw authNeeded(`No valid authentication found. 
    Errors:
    ${errors.join('\n')}`);
  });
