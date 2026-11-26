import { getSharedConnection } from '../redis';
import { randomToken, sha256Hex } from './crypto';

// RFC 6749 §4.1.2: codes are short-lived. 600s is the spec's ceiling and
// absorbs consent think-time and slow redirect chains on weak networks.
const CODE_TTL_SEC = 600;

export interface OAuthAuthorizationCode {
  clientId: string;
  redirectUri: string;
  profileId: string;
  accountId?: string;
  scopes: string[];
  codeChallenge: string;
  nonce?: string;
  /** Seconds since epoch of the user's login (OIDC `auth_time`). */
  authTime?: number;
}

const codeKey = (code: string) => `oauth:codes:${sha256Hex(code)}`;

export const issueOAuthAuthorizationCode = async (
  data: OAuthAuthorizationCode,
): Promise<string> => {
  const code = randomToken();
  await (
    await getSharedConnection()
  ).setEx(codeKey(code), CODE_TTL_SEC, JSON.stringify(data));
  return code;
};

/** `GETDEL` makes redemption atomic: a code works exactly once. */
export const redeemOAuthAuthorizationCode = async (
  code: string,
): Promise<OAuthAuthorizationCode | undefined> => {
  const raw = await (await getSharedConnection()).getDel(codeKey(code));
  return raw ? (JSON.parse(raw) as OAuthAuthorizationCode) : undefined;
};
