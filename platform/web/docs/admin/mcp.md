# MCP for operators

AllPeep mounts [Model Context Protocol](https://modelcontextprotocol.io) (MCP)
on the API process so AI assistants can call a curated subset of the HTTP API.
There is no separate MCP container or daemon.

Members connect to **community** MCP to read groups, posts, and profiles. That
flow is documented in [Connect an AI assistant (MCP)](/docs/user/mcp).

This page covers **ops** MCP, how to enable or disable the layer, and how
tokens and reverse proxies should be set up.

<div style="height:20px"></div>

## Endpoints

Both routes are Streamable HTTP. They are mounted when `OPENPEEPS_MCP` is not
`0` (enabled by default).

| URL | Profile | Who should use it |
| --- | ------- | ----------------- |
| `/mcp/community` | Member APIs | People and bots acting as a member |
| `/mcp/ops` | Curated `/admin/*` APIs | Owners and moderators with the matching role capabilities |

Example:

```
https://community.example.com/mcp/ops
```

Every request requires:

```
Authorization: Bearer <jwt>
```

Missing Bearer → `401 Unauthorized` with `{ "error": "Unauthorized" }`.
Capability checks still run in the API: a member token on `/mcp/ops` can
**list** ops tools, then receive `403` when a tool runs.

The two catalogs are disjoint. Community MCP never lists `admin_*` tools.

<div style="height:20px"></div>

## Enable and disable

| Variable | Effect |
| -------- | ------ |
| `OPENPEEPS_MCP` unset or any value other than `0` | Mount `/mcp/community` and `/mcp/ops` |
| `OPENPEEPS_MCP=0` | Do not mount the routes (clients see `404`) |
| `OPENPEEPS_MCP_API_BASE` | Origin the MCP tools use when they call the API in-process. Default `http://127.0.0.1:$PORT` (`PORT` defaults to `5173`) |

MCP tools do not bootstrap `@openpeepshq/core` themselves. They call
`/api/openpeeps/core/v1/...` on `OPENPEEPS_MCP_API_BASE` with the caller's
Bearer token. On a typical single-process deploy the default loopback origin
is correct. Set `OPENPEEPS_MCP_API_BASE` only if the API is not reachable at
`127.0.0.1` from the server process (for example a split frontend/API
deployment).

There is no admin UI toggle. Restart the API process after changing these
variables.

<div style="height:20px"></div>

## Tokens for ops

Ops tools go through the existing admin HTTP API, which checks **role
capabilities** on the caller's profile. Use a **personal access token** created
while signed in as an owner or moderator:

1. Sign in as that administrator.
2. Open **Settings → Access tokens** (`/settings/access-tokens`).
3. Create a token with the scopes the tools will need (`admin` level on
   `*` is the blunt option for a private operator workstation; prefer the
   narrowest scopes you can).
4. Copy the secret once and put it in the MCP client's `Authorization` header.

**Administration → API Keys** (`/admin/api-keys`) issues **service** tokens
for other integrations. Those tokens usually have no profile, so admin role
checks fail. Prefer a personal access token for `/mcp/ops`.

Do not paste a long-lived admin token into a shared laptop, a public gist, or
an MCP config that is committed to git. Revoke the token if it leaks.

<div style="height:20px"></div>

## Connect an ops client

Use the same recipes as [Connect an AI assistant (MCP)](/docs/user/mcp)
(Claude, ChatGPT desktop/Codex, OpenCode, OpenClaw, Hermes, Cursor). Change
only the URL and the token:

- URL: `https://your-community.example/mcp/ops`
- Token: an admin-capable personal access token (see above)

Cursor example:

```json
{
  "mcpServers": {
    "openpeeps-ops": {
      "url": "https://your-community.example/mcp/ops",
      "headers": {
        "Authorization": "Bearer <admin-capable-jwt>"
      }
    }
  }
}
```

Point a second server at `/mcp/community` if the same assistant should also
use member tools.

On OpenClaw, keep `transport: "streamable-http"`. On OpenCode, keep
`oauth: false`. Do not start an OAuth login against AllPeep MCP.

<div style="height:20px"></div>

## Ops tools

Mutating tools are marked. They have the same effect as the matching action in
**Administration**.

| Tool | Purpose |
| ---- | ------- |
| `admin_server_stats` | Server stats |
| `admin_list_logs` | Log rows for an optional `date` (`YYYY-MM-DD`) |
| `admin_config_read` | Read config by `namespace` and `name` |
| `admin_config_update` | **Patch** config by `namespace` and `name` |
| `admin_list_reports` | List all reports |
| `admin_resolve_report` | **Resolve** a report (`ignore`, `remove`, `warn`, `ban`, `other`) |
| `admin_list_profiles` | List profiles |
| `admin_list_accounts` | List accounts |
| `admin_list_backups` | List backup archive names |
| `admin_create_backup` | **Create** a backup (see [Backups](/docs/admin/backups)) |
| `admin_email_queue_stats` | Email queue diagnostics |
| `admin_job_detail` | BullMQ job by `queue` and `jobId` |
| `admin_list_groups` | List all groups |
| `admin_delete_group` | **Delete** a group (`core-groups-delete`) |

If ops needs a capability the admin HTTP API does not expose yet, add a
role-gated admin endpoint first, then wrap it as an MCP tool. Do not bootstrap
core in-process only for MCP.

<div style="height:20px"></div>

## Reverse proxy and TLS

- Serve MCP on the same HTTPS host as the community. Do not expose `/mcp/*` on
  plain HTTP.
- Forward the `Authorization` header. Some proxies strip it unless
  `Authorization` is in the allowlist.
- Do not log full Bearer tokens. They are reusable secrets.
- MCP is not a second auth system: disabling public sign-up, SSO, and role
  capabilities still apply to every tool call.

To turn MCP off entirely (for example on an instance that should not accept
assistant traffic):

```bash
OPENPEEPS_MCP=0
```

<div style="height:20px"></div>

## Local stdio (development)

On a machine that can reach the API, you can run the stdio server from the
OpenPeeps repo instead of Streamable HTTP:

```bash
OPENPEEPS_TOKEN=<jwt> \
OPENPEEPS_API_BASE=https://your-community.example \
pnpm --filter @openpeepshq/mcp exec openpeeps-mcp --profile ops
```

Use `--profile community` (the default) or `OPENPEEPS_MCP_PROFILE` for member
tools. `OPENPEEPS_API_BASE` is the community origin the tools call.

<div style="height:20px"></div>

## Troubleshooting

| Symptom | Likely cause |
| ------- | ------------ |
| `404` on `/mcp/community` or `/mcp/ops` | `OPENPEEPS_MCP=0`, or the request hit a frontend that does not proxy those paths to the API |
| `401` | Missing or malformed `Authorization: Bearer …` |
| Tool lists appear, calls return `403` | Token belongs to a member, or the profile lacks the admin capability for that tool |
| Tools fail with connection errors | `OPENPEEPS_MCP_API_BASE` does not reach the API from the server process |
| Community client shows `admin_*` tools | It is pointed at `/mcp/ops` by mistake |

<div style="height:20px"></div>

## Related documentation

- [Connect an AI assistant (MCP)](/docs/user/mcp) — member URL, tokens, and community tools
- [Backups](/docs/admin/backups)
- [Routes](/docs/development/routes)
