import type {
  AccountWithMeta,
  ProfileWithMeta,
} from '@openpeepshq/common/types';

/** OIDC standard claims (Core §5.1), released per granted scope. */
export const oidcClaims = ({
  profile,
  account,
  scopes,
}: {
  profile: ProfileWithMeta;
  account?: AccountWithMeta;
  scopes: string[];
}): Record<string, string | boolean> => ({
  sub: profile.id,
  ...(scopes.includes('profile')
    ? {
        preferred_username: profile.handle,
        name: profile.displayName || profile.handle,
        ...(profile.avatar ? { picture: profile.avatar } : {}),
      }
    : {}),
  ...(scopes.includes('email') && account
    ? { email: account.email, email_verified: !!account.emailValidated }
    : {}),
});
