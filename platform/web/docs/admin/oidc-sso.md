# Setting Up OIDC SSO

OIDC SSO (OpenID Connect) lets members sign in to your AllPeep community
through an external identity provider (for example Keycloak, Authentik,
Auth0, or WordPress OIDC). OpenPeep uses the authorization code flow with
PKCE. This is separate from [Generic SSO](/docs/admin/generic-sso), which
calls a custom profile API instead of a standard OIDC provider.

<div style="height:20px"></div>

## Where members find it

When any SSO providers are configured, the login page shows a button for
each of them:

- Every **Oidc** provider → **Login with {provider name}**
- Every **Generic** provider with a valid **LoginLink** → **Login with
  {provider name}**

Members click a button to start sign-in with that provider.

The OIDC authorize URL is:

```
/api/openpeeps/core/v1/sso/oidc/{providerId}/authorize
```

You can also link directly to that path if you want a custom entry point.

### Sending members straight to SSO

Check **Only SSO** on the SSO configuration page if members should not
see the community password form (for example because they arrive from
email links).

- One SSO destination: `/auth/login` redirects to that provider.
- Several destinations (multiple OIDC providers and/or generic providers
  with **LoginLink**): the login page lists a link for each option.
- Generic **LoginLink** is the URL for a custom SSO portal. Set it on each
  generic provider entry when members should leave OpenPeeps to sign in.

Administrators with a password account can use the visually hidden
**Administrator login** control, or open `/auth/login?local=1`.

<div style="height:20px"></div>

## How it works

1. **Authorize**: The member clicks **Login with {provider}**. OpenPeep
   redirects them to the provider's authorization URL with PKCE parameters.

2. **Provider sign-in**: The member authenticates at the identity provider.

3. **Callback**: The provider redirects back to OpenPeep's callback URL with
   an authorization code.

4. **Token exchange**: OpenPeep exchanges the code for tokens, verifies the
   `id_token` (using **JwksUri** when set), and reads user claims.

5. **Account matching**: OpenPeep looks up an existing account by email. If
   one exists, the member is logged in. If not, a new account and profile
   are created (unless **ApprovalRequired** is checked).

6. **Session**: The member receives a signed access token and is redirected
   into the community (default: `/feeds/local`).

<div style="height:20px"></div>

## Configuration

OIDC, GitLab, and GitHub providers are configured on the **SSO** page in the
admin area.

### Open SSO settings

1. Log in as a community owner.
2. Open **Administration → Configuration**.
3. Choose **SSO** (or go directly to `/admin/configuration/sso`).

### Add a provider

1. Under **Add provider**, click a provider type.
2. On the next page, fill in the fields for that type. The **Id** is
   prefilled (for example `github`, or `github-2` if that id is taken).
   Built-in types fill endpoint URLs, scopes, and claim mapping from
   templates when you save.
3. Click **Save provider**.

Use **Edit** or **Remove** on an existing entry to change or delete it.

Built-in OpenID Connect presets: **GitLab**, **GitLab (self-hosted)**,
**Google**, **Microsoft Entra ID**, **Auth0**, **Okta**, **Keycloak**,
**Authentik**, and **Pocket ID**. **GitHub** and **Discord** use the same
OIDC routes with OAuth-only accommodations (no `id_token`).

### GitHub

GitHub user login is OAuth 2.0, not a full OpenID Connect IdP: it does not
return an `id_token`. OpenPeep still stores GitHub under `sso.oidc` and uses
the same `/sso/oidc/{id}` authorize/callback routes. After the token
exchange it reads `/user` and, when email is missing, `/user/emails`
(requires the `user:email` scope).

Register the OIDC callback URL below with the GitHub OAuth App. For GitHub
Enterprise, set **Instance URL** to your host; public GitHub can leave that
field empty.

### GitLab

**GitLab** is GitLab.com. **GitLab (self-hosted)** needs your GitLab host;
saving writes the authorize, token, userinfo, and JWKS URLs for that host.

### Discord

Discord is OAuth 2.0, not a full OpenID Connect IdP. OpenPeep stores it under
`sso.oidc` and reads `/users/@me` after the token exchange (`identify email`).
Avatar hashes are turned into `cdn.discordapp.com` URLs.

### Provider fields

Each **Oidc** entry has the following fields:

| Field                | What to enter                                                                                                                                                     |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Id**               | A short, URL-safe identifier (for example `keycloak` or `company-sso`). Used in the callback URL — set this before registering the redirect URI at your provider. |
| **Name**             | The label shown on the login button (for example `Company SSO`).                                                                                                  |
| **AuthorizationUrl** | Your provider's authorization endpoint.                                                                                                                           |
| **TokenUrl**         | Your provider's token endpoint.                                                                                                                                   |
| **UserinfoUrl**      | Your provider's userinfo endpoint (used as a fallback when claims are missing from the token).                                                                    |
| **ClientId**         | The OAuth client ID from your provider.                                                                                                                           |
| **ClientSecret**     | The OAuth client secret, if your provider requires one. Leave empty for PKCE-only public clients. This field is masked like a password.                           |
| **JwksUri**          | Your provider's JWKS URL. Strongly recommended in production so OpenPeep can verify `id_token` signatures.                                                        |
| **Scope**            | Space-separated scopes to request. Defaults to `openid email profile` if left empty.                                                                              |
| **ApprovalRequired** | Check this to require administrator approval before new accounts are created. Existing accounts with a matching email still log in normally.                      |

Above the provider list, **Only SSO** hides the password form. For custom
(non-OIDC) portals, add a **Generic** provider on the same page and set
**Login link** — those links appear alongside OIDC buttons on the login page.

### Claim mapping

Each provider entry also has a nested **ClaimMapping** section. These fields
tell OpenPeep which OIDC claim names map to profile data:

| Field           | Default              | Purpose                                                                         |
| --------------- | -------------------- | ------------------------------------------------------------------------------- |
| **Email**       | `email`              | Used to match or create accounts. Required for sign-in to work.                 |
| **Handle**      | `preferred_username` | Seed for the member's `@handle`. Falls back to the email local-part if missing. |
| **DisplayName** | `name`               | Shown as the member's display name.                                             |
| **Avatar**      | `picture`            | Profile picture URL, when provided by the identity provider.                    |

Leave a claim-mapping field at its default unless your provider uses different
claim names.

### Server host

The callback URL is built from **Server → Host** on the Server Settings page
(also set via the `SERVER_HOST` environment variable). Make sure **Host**
matches your community's public URL before testing sign-in.

<div style="height:20px"></div>

## Redirect URI

Register this callback URL with your identity provider for each configured
provider. Use the **Id** you entered on the SSO page and your **Server →
Host** value:

```
https://your-community.com/api/openpeeps/core/v1/sso/oidc/{providerId}/callback
```

For local development with `localhost:5174`, the callback uses `http://`
instead of `https://`.

The redirect URI must match exactly what you register at the provider,
including scheme, host, port, and path.

<div style="height:20px"></div>

## Provider setup checklist

1. Create an OAuth/OIDC client at your identity provider.
2. Confirm **Server → Host** on server settings matches your public URL.
3. On the SSO page, add a provider with an **Id**.
4. Register the redirect URI at your provider:
   `https://<host>/api/openpeeps/core/v1/sso/oidc/<Id>/callback`.
5. Enable the authorization code grant (with PKCE / S256).
6. Copy the client ID, client secret (if any), and (for OIDC Generic)
   endpoint URLs into the matching fields.
7. Set **Scope** to include email. GitLab/OIDC default to
   `openid email profile`; GitHub defaults to `read:user user:email`.
8. Click **Save provider**.
9. Visit the login page and verify the **Login with {Name}** button appears
   and completes sign-in.

<div style="height:20px"></div>

## Troubleshooting

### Button does not appear on the login page

- Confirm at least one provider exists on the SSO page and you clicked
  **Save provider**.
- Reload the login page; provider names are loaded from server info at page
  load.

### Redirect URI mismatch

- Compare the URI registered at your provider with the URL built from
  **Server → Host** and your provider **Id**.
- Check for `http` vs `https` or a missing port on localhost.

### "Could not extract valid email from OIDC claims"

- Ensure **Scope** includes email (for example `openid email profile`).
- Confirm your provider returns `email` in the `id_token` or userinfo
  response.
- Adjust **ClaimMapping → Email** if your provider uses a different claim
  name.

### "PKCE code verifier mismatch or state already used"

- PKCE state is stored in Redis and expires after five minutes. The member
  must complete sign-in within that window and cannot reuse a callback URL.
- Ensure Redis is running and reachable by the OpenPeep server.

### JWT verification errors

- Set **JwksUri** to your provider's JWKS endpoint.
- Confirm the provider's signing keys are accessible from your server.

<div style="height:20px"></div>

## Security notes

- Set **JwksUri** in production so `id_token` signatures are verified.
- Keep **Client secret** confidential; it is stored as a masked password field
  on the SSO page.
- Prefer HTTPS for all provider endpoints and for your community's public
  URL.
- Redis must be available; PKCE state is not persisted elsewhere.

<div style="height:20px"></div>

## Related documentation

- [Setting Up Generic SSO](/docs/admin/generic-sso) — custom profile API
  integration (non-OIDC providers)
