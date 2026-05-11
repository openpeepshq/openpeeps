import { createAuthorization } from '@openpeeps/core/auth';
import type { RegisterRequest, TokenResponse } from '@openpeeps/common/types';
import { conflict } from '#lib/errors';
import { createAccount, existsAccountByEmail } from '@openpeeps/core/accounts';
import { existsProfileByHandle } from '@openpeeps/core/profiles';
import { existsGroupByHandle } from '@openpeeps/core/groups';
import type { OpenpeepsError } from '@openpeeps/common/types';
import { jwtUtil } from '@openpeeps/core/jwt';
import { config } from '@openpeeps/core/config';
import { findInviteLinkBySlug } from '@openpeeps/core/inviteLinks';

export const registerHandler = async (
  registerRequest: RegisterRequest,
): Promise<TokenResponse> => {
  const { handle, password, email, displayName, inviteCode } = registerRequest;


  if (await existsProfileByHandle(handle) || await existsGroupByHandle(handle)) {
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
    throw {
      __allPeepError__: true,
      code: 403,
      errorKey: 'invalidInviteCode',
      message: inviteLinkDetails
        ? !inviteLinkValid
          ? 'Invalid Invite Code'
          : 'Max Uses Reached'
        : 'Invalid Invite Code',
    } as OpenpeepsError;
  }

  if (!signUpsOpen && !inviteCode) {
    throw {
      __allPeepError__: true,
      code: 403,
      errorKey: 'signUpsClosed',
      message: 'Sign-ups are closed and no valid invite code provided',
    } as OpenpeepsError;
  }

  const { account, profile } = await createAccount({
    email,
    password,
    profile: {
      handle,
      displayName,
    },
    inviteCode,
  });

  const authorization = createAuthorization(account.id, profile?.id);
  const jwt = await jwtUtil();
  const token = await jwt.sign(authorization);

  return {
    success: true,
    token,
  };
};
