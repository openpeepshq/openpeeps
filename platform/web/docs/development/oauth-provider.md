# OAuth 2.0 / OpenID Connect provider

OpenPeeps is an OpenID Connect provider. Apps can sign members in with their
community account ("Sign in with OpenPeeps") and call the API on their behalf.
The native OpenPeeps app uses the same flow to log in through the browser.

<div style="height:20px"></div>

## Endpoints

| Purpose                     | Path                                                                                |
| --------------------------- | ----------------------------------------------------------------------------------- |
| Discovery                   | `/.well-known/openid-configuration` (and `/.well-known/oauth-authorization-server`) |
| Authorization (consent UI)  | `/oauth/authorize` (SPA route)                                                      |
| Token                       | `POST /api/openpeeps/core/v1/oauth/token`                                           |
| Revocation (RFC 7009)       | `POST /api/openpeeps/core/v1/oauth/revoke`                                          |
| UserInfo                    | `GET/POST /api/openpeeps/core/v1/oauth/userinfo`                                    |
| JWKS                        | `GET /api/openpeeps/core/v1/oauth/jwks`                                             |
| Dynamic registration (7591) | `POST /api/openpeeps/core/v1/oauth/register`                                        |

The issuer is the server root URL. Protocol endpoints answer CORS for any
origin and use RFC 6749 error bodies; they live in
`platform/server/src/lib/oauth.ts`. Everything else (consent, connected apps,
client admin) is a normal Riddl endpoint under `oauth/` and `admin/oauth/`.

<div style="height:20px"></div>

## Flow

Only the authorization code grant with PKCE (`S256`, mandatory for every
client) and the refresh token grant are supported.

1. The app sends the member to `/oauth/authorize` with `client_id`,
   `redirect_uri`, `scope`, `state`, `code_challenge` and optionally `nonce`.
2. Signed-out members are sent to the login page and back. The consent page
   asks once per app; later requests that stay within the granted scopes are
   approved without a prompt. Grants are listed under **Settings → Connected
   apps**, where members can revoke them.
3. The app exchanges the code (single use, 60 s) at the token endpoint and
   receives a 1 h access token, an RS256 `id_token` when `openid` was granted,
   and a rotating 30 day refresh token when `offline_access` was granted.

Reusing a refresh token revokes its whole family, including the access
tokens it issued. Revoking a grant or deleting a client does the same.

<div style="height:20px"></div>

## Scopes

- OIDC: `openid`, `profile` (name, username, avatar), `email`,
  `offline_access`.
- API: `<resource>:read` and `<resource>:write` for `posts`, `profiles`,
  `groups`, `jams`, `conversations`, `reports` and `notifications`.
- `*:admin`: the member's full access. Only first-party clients may request
  it; the native app uses it.

Access tokens are regular OpenPeeps JWTs whose `identities.client` names the
app. The authorization middleware treats such a delegated token as absent on
any route its scopes do not cover (`GET`/`HEAD` need `read`, everything else
`write`, matched by the first path segment), so role-gated routes such as
`admin/*` stay unreachable without `*:admin`. `/auth/refresh` refuses
delegated tokens; apps refresh through the token endpoint.

<div style="height:20px"></div>

## Clients

Admins register clients under **Admin → Configuration → OAuth clients**
(`core-config-update`). A client is public unless marked confidential, in
which case its secret is shown once and authenticates with HTTP Basic
(`client_id:client_secret` in the `Authorization` header — then `client_id`
must not also be sent in the body) or `client_id`/`client_secret` as body
parameters. Redirect URIs must be `https`, loopback `http`
(any port matches, RFC 8252 §7.3), or a private-use scheme in reverse-domain
form (`org.example.app:/callback`). Confidential clients get a
**Rotate secret** button: the old secret stops authenticating immediately
(already-issued tokens are kept), the new one is shown once.

Dynamic client registration is off by default; the same admin page toggles
`oauth.dynamicRegistration` in the core config. Self-registered clients are
always public and never first-party, and registration is rate limited per IP.
Dynamically registered confidential secrets expire after
`oauth.clientSecretLifetimeSeconds` (default one year; `0` keeps them
non-expiring) and the token endpoint rejects them once expired —
`client_secret_expires_at` in the RFC 7591 response reflects the lifetime.
Admin-registered secrets do not expire.

<div style="height:20px"></div>

## Native app login

`platform/rn-components` shows **Continue in browser** on the login screen
when the app's `react-native-config` sets `OAUTH_CLIENT_ID` and
`OAUTH_REDIRECT_URI`. Register that client as first-party with the same
redirect URI, and register its URL scheme in the host app. The app needs a
`crypto.getRandomValues` polyfill (for example
`react-native-get-random-values`) for PKCE. The stored credentials carry the
refresh token; the shared provider refreshes the access token five minutes
before it expires.
