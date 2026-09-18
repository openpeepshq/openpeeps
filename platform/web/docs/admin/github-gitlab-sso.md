# Setting Up GitHub / GitLab SSO

GitHub and GitLab SSO let members sign in with their github.com or gitlab.com
account (or a private/self-hosted instance, e.g. GitHub Enterprise or
`git-lab.de`). This is a dedicated OAuth2 flow, separate from
[OIDC SSO](/docs/admin/oidc-sso): neither GitHub nor GitLab issues an
`id_token`, so they cannot be wired up through the OIDC provider form.
OpenPeep talks to their REST APIs directly (`GET /user` for GitHub,
`GET /api/v4/user` for GitLab) to read the member's profile after the
OAuth2 code exchange.

You can configure several entries under **Github** and several under
**Gitlab** on the server settings page — one for the public service and one
per private instance you want to support.

<div style="height:20px"></div>

## Where members find it

When any provider is configured, the login page shows a button with the
matching GitHub/GitLab icon:

- Every **Github** entry → **Login with {name}**
- Every **Gitlab** entry → **Login with {name}**

The authorize URLs are:

```
/api/openpeeps/core/v1/sso/github/{providerId}/authorize
/api/openpeeps/core/v1/sso/gitlab/{providerId}/authorize
```

<div style="height:20px"></div>

## Public service vs. private instance

Leave **InstanceUrl** empty to use the public service:

- GitHub → `https://github.com` (API: `https://api.github.com`)
- GitLab → `https://gitlab.com`

Set **InstanceUrl** to point at a private instance instead, for example
`https://git-lab.de` for a self-hosted GitLab, or your GitHub Enterprise
Server URL. OpenPeep derives the authorize/token/profile endpoints from
**InstanceUrl** automatically — no extra fields are needed for a private
instance beyond **InstanceUrl**, **ClientId**, and **ClientSecret**.

<div style="height:20px"></div>

## How it works

1. **Authorize**: The member clicks **Login with {name}**. OpenPeep
   redirects them to the provider's authorization URL with PKCE parameters.
2. **Provider sign-in**: The member authenticates at GitHub/GitLab.
3. **Callback**: The provider redirects back to OpenPeep's callback URL with
   an authorization code.
4. **Token exchange**: OpenPeep exchanges the code for an access token.
5. **Profile fetch**: OpenPeep calls the provider's user API (and, for
   GitHub, the emails API if no public email is set) to get a verified
   email, avatar, and display name.
6. **Account matching**: OpenPeep looks up an existing account by email. If
   found, it signs the member in. Otherwise, subject to **ApprovalRequired**,
   it creates a new account and profile.

The callback URL is:

```
https://your-community.com/api/openpeeps/core/v1/sso/github/{providerId}/callback
https://your-community.com/api/openpeeps/core/v1/sso/gitlab/{providerId}/callback
```

The redirect URI must match exactly what you register at the provider,
including scheme, host, port, and path.

<div style="height:20px"></div>

## Provider setup checklist

### GitHub

1. Create an OAuth App at `https://github.com/settings/developers` (or your
   GitHub Enterprise instance's equivalent page).
2. Set the **Authorization callback URL** to
   `https://<host>/api/openpeeps/core/v1/sso/github/<Id>/callback`.
3. In server settings, add a **Github** entry with an **Id**, the app's
   **ClientId**/**ClientSecret**, and — for a private GitHub Enterprise
   instance only — **InstanceUrl**.
4. Set **Scope** if you need more than the default `read:user user:email`.
5. Click **Submit**, then visit the login page and verify the button appears
   and completes sign-in.

### GitLab

1. Create an application at `https://gitlab.com/-/user_settings/applications`
   (or your self-hosted instance's equivalent page).
2. Set the **Redirect URI** to
   `https://<host>/api/openpeeps/core/v1/sso/gitlab/<Id>/callback`.
3. Enable the **Authorization code** grant.
4. In server settings, add a **Gitlab** entry with an **Id**, the
   application's **ClientId**/**ClientSecret**, and — for a private
   instance such as `git-lab.de` — **InstanceUrl**.
5. Set **Scope** if you need more than the default `read_user`.
6. Click **Submit**, then visit the login page and verify the button appears
   and completes sign-in.

<div style="height:20px"></div>

## Troubleshooting

### Button does not appear on the login page

- Confirm at least one **Github**/**Gitlab** entry exists on the server
  settings page and you clicked **Submit** to save.
- Reload the login page; provider names are loaded from server info at page
  load.

### Redirect URI mismatch

- Compare the URI registered at the provider with the URL built from
  **Server → Host**, the provider kind (`github`/`gitlab`), and your entry's
  **Id**.

### "Could not extract a verified email from github/gitlab profile"

- For GitHub, make sure the OAuth App's scope includes `user:email`, or that
  the member's account has at least one verified email address.
- For GitLab, make sure the application's scope includes `read_user`.

### "PKCE code verifier mismatch or state already used"

- PKCE state is stored in Redis and expires after five minutes. The member
  must complete sign-in within that window and cannot reuse a callback URL.
- Ensure Redis is running and reachable by the OpenPeep server.

<div style="height:20px"></div>

## Security notes

- Keep **ClientSecret** confidential; it is stored as a masked password field
  on the server settings page.
- Prefer HTTPS for all provider endpoints and for your community's public
  URL.
- Redis must be available; PKCE state is not persisted elsewhere.

<div style="height:20px"></div>

## Related documentation

- [Setting Up OIDC SSO](/docs/admin/oidc-sso) — generic OIDC provider
  integration
- [Setting Up Generic SSO](/docs/admin/generic-sso) — custom profile API
  integration (non-OIDC providers)
