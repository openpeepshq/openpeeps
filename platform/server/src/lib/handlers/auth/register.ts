import type {
  AuthorizationData,
  RegisterRequest,
  TokenResponse,
} from '@openpeeps/common/types';
import { checkAccountCreateAuthorization } from '@openpeeps/common/lib';
import { conflict, forbidden } from '#lib/errors';
import { createAccount, existsAccountByEmail } from '@openpeeps/core/accounts';
import { existsProfileByHandle } from '@openpeeps/core/profiles';
import { existsGroupByHandle } from '@openpeeps/core/groups';
import { config } from '@openpeeps/core/config';
import { findInviteLinkBySlug } from '@openpeeps/core/inviteLinks';
import { createSignedProfileAccessToken } from '@openpeeps/core/accessTokens';

export const registerHandler = async (
  registerRequest: RegisterRequest,
  authData: AuthorizationData = { scopes: [] },
): Promise<TokenResponse> => {
  const { handle, password, email, displayName, inviteCode } = registerRequest;

  if (
    (await existsProfileByHandle(handle)) ||
    (await existsGroupByHandle(handle))
  ) {
    throw conflict('profiles.handleExists');
  }

  if (await existsAccountByEmail(email)) {
    throw conflict('auth.register.emailAlreadyTaken');
  }

  const {
    server: { signUpsOpen },
  } = await config();

  const inviteLinkDetails =
    inviteCode && (await findInviteLinkBySlug(inviteCode));

  const inviteLinkValid =
    (inviteLinkDetails && inviteLinkDetails?.active) || false;

  const inviteLinkUsable =
    inviteLinkDetails &&
    inviteLinkDetails.maxUses > 0 &&
    (inviteLinkDetails?.redemptions?.length || 0) < inviteLinkDetails.maxUses;

  if (
    inviteCode &&
    (!inviteLinkDetails || !inviteLinkValid || !inviteLinkUsable)
  ) {
    throw forbidden(
      inviteLinkDetails
        ? !inviteLinkValid
          ? 'Invalid Invite Code'
          : 'Max Uses Reached'
        : 'Invalid Invite Code',
    );
  }

  let authorizedCreate = false;
  if (!signUpsOpen && !inviteCode) {
    const authResult = checkAccountCreateAuthorization(authData);
    if (authResult.success) {
      authorizedCreate = true;
    } else if (authData.service || authData.profile) {
      throw forbidden(
        authResult.missingScope
          ? 'auth.scope.not-authorized'
          : `Missing capabilities: ${authResult.missingCapabilities.join(', ')}`,
      );
    } else {
      throw forbidden('Sign-ups are closed and no valid invite code provided');
    }
  }

  const { account, profile } = await createAccount({
    email,
    password,
    emailValidated: authorizedCreate,
    profile: {
      handle,
      displayName,
    },
    inviteCode,
  });

  const token = await createSignedProfileAccessToken({
    account,
    profile,
    name: 'register',
    expirationTime: '1w',
  }).then((accessToken) => accessToken.signedToken);

  if (!token) {
    throw forbidden('register.access-token-creation-failed');
  }

  return {
    success: true,
    token,
  };
};
