# Connect an AI assistant (MCP)

AllPeep can speak [Model Context Protocol](https://modelcontextprotocol.io)
(MCP). That lets an AI assistant — for example Cursor, Claude, or another MCP
client — search and read your community the same way you can: groups, posts,
profiles, and reports you already have access to.

The assistant does **not** get extra privileges. It uses a personal access
token that acts as you, and it only sees what that token is allowed to see.

Operators who need server stats, backups, or moderation tools should use the
[ops MCP documentation](/docs/admin/mcp) instead.

<div style="height:20px"></div>

## What you need

1. The public URL of your community, for example
   `https://community.example.com`.
2. A personal access token from **Settings → Access tokens**
   (`/settings/access-tokens`).
3. An MCP client that supports **Streamable HTTP** and custom request headers.

<div style="height:20px"></div>

## Create an access token

1. Sign in to the community.
2. Open **Settings → Access tokens**.
3. Give the token a name you will recognize later (for example `Cursor MCP`).
4. Choose an expiration (30 days is a reasonable default).
5. Add **read** scopes for the things you want the assistant to use:
   - `posts` — list and open posts
   - `profiles` — look up people
   - `groups` — list groups and members
   - `reports` — your own reports
6. Create the token and **copy it immediately**. AllPeep shows the secret only
   once.

Treat the token like a password. Anyone who has it can act as you through the
API until you revoke it or it expires. Revoke unused tokens on the same
settings page.

<div style="height:20px"></div>

## Community MCP URL

```
https://your-community.example/mcp/community
```

Replace `your-community.example` with your community host. Every request must
include:

```
Authorization: Bearer <your-access-token>
```

If the header is missing, the server responds with `401 Unauthorized`.

<div style="height:20px"></div>

## Connect a client

Every client below uses the same community URL and
`Authorization: Bearer <your-access-token>`. AllPeep does **not** speak MCP
OAuth. If a client tries to “Sign in with OAuth”, that flow will fail — send
the Bearer header instead.

For ops tools (`/mcp/ops`), use an [administrator token](/docs/admin/mcp) and
the same recipes with that URL.

Ask the assistant things like “search recent posts about the welcome group”
or “who is in the Backstage group?”.

<div style="height:20px"></div>

### Cursor

Cursor Settings → MCP, or project `.cursor/mcp.json` / `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "openpeeps-community": {
      "url": "https://your-community.example/mcp/community",
      "headers": {
        "Authorization": "Bearer <your-access-token>"
      }
    }
  }
}
```

<div style="height:20px"></div>

### Claude

**Claude Code** (recommended):

```bash
claude mcp add --transport http openpeeps-community \
  https://your-community.example/mcp/community \
  --header "Authorization: Bearer ${OPENPEEPS_TOKEN}"
```

Or in `.mcp.json` / `~/.claude.json`:

```json
{
  "mcpServers": {
    "openpeeps-community": {
      "type": "http",
      "url": "https://your-community.example/mcp/community",
      "headers": {
        "Authorization": "Bearer ${OPENPEEPS_TOKEN}"
      }
    }
  }
}
```

Put the token in the `OPENPEEPS_TOKEN` environment variable so it is not
committed. Check the connection with `/mcp` or `claude mcp list`.

**claude.ai** (Customize → Connectors → Add custom connector):

1. Name the connector (for example `AllPeep`).
2. MCP server URL:
   `https://your-community.example/mcp/community`
3. Authentication: **No sign-in** (AllPeep has no OAuth for MCP).
4. Under **Request headers**, add `Authorization` with value
   `Bearer <your-access-token>` (include the word `Bearer` and the space).
5. Enable the connector from the **+** menu in a chat.

Request-header auth is rolling out and may be missing on some plans. If the
dialog has no Request headers section, use Claude Code or the Desktop bridge
below.

**Claude Desktop** (`claude_desktop_config.json` is stdio-only). Bridge with
`mcp-remote`:

- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "openpeeps-community": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "https://your-community.example/mcp/community",
        "--header",
        "Authorization:${AUTH_HEADER}"
      ],
      "env": {
        "AUTH_HEADER": "Bearer <your-access-token>"
      }
    }
  }
}
```

Keep the header as `Authorization:${AUTH_HEADER}` with **no space** around the
colon. Put `Bearer ` plus the token in `AUTH_HEADER` so Windows does not split
the argument. Restart Claude Desktop after saving.

<div style="height:20px"></div>

### ChatGPT

AllPeep MCP requires a Bearer token on **every** request, including tool
discovery. ChatGPT **desktop**, the Codex CLI, and the Codex IDE extension
share `~/.codex/config.toml` and support that.

**ChatGPT desktop / Codex** — Settings → MCP servers → Add server →
Streamable HTTP, or edit `~/.codex/config.toml`:

```toml
[mcp_servers.openpeeps_community]
url = "https://your-community.example/mcp/community"
bearer_token_env_var = "OPENPEEPS_TOKEN"
```

```bash
export OPENPEEPS_TOKEN='<your-access-token>'
```

Do not set `auth = "oauth"`. Restart the desktop app or Codex after saving.
In chat, `/mcp` lists connected servers.

**ChatGPT web** (Developer mode, Plus/Pro and workspace plans):

1. Settings → Security and login → turn on **Developer mode**.
2. Open Plugins, create a developer-mode app, and paste the community MCP URL.
3. If the dialog offers **Token** / **API key** / request headers, use
   `Authorization` = `Bearer <your-access-token>`.
4. Scan tools, create the app, then pick **Developer mode** in the composer
   **+** menu and enable the app.

Hosted ChatGPT web currently documents OAuth, no-auth, and mixed auth. AllPeep
rejects unauthenticated `initialize` / `tools/list` (`401`) and does not
implement MCP OAuth, so a web-only connector often cannot finish setup. Use
ChatGPT desktop or Codex when that happens.

<div style="height:20px"></div>

### OpenCode

Add a remote server in `opencode.jsonc` (project or `--global`). Disable OAuth
so OpenCode sends the static header:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "servers": {
      "openpeeps-community": {
        "type": "remote",
        "url": "https://your-community.example/mcp/community",
        "oauth": false,
        "headers": {
          "Authorization": "Bearer {env:OPENPEEPS_TOKEN}"
        }
      }
    }
  }
}
```

```bash
export OPENPEEPS_TOKEN='<your-access-token>'
opencode mcp list
```

`{env:OPENPEEPS_TOKEN}` is OpenCode substitution, not a shell `$VAR`. Confirm
the server shows as connected. In a session, `/mcps` lists servers.

<div style="height:20px"></div>

### OpenClaw

AllPeep is Streamable HTTP. OpenClaw defaults to SSE if you omit `transport`,
so set it explicitly.

```bash
openclaw mcp add openpeeps-community \
  --url https://your-community.example/mcp/community \
  --transport streamable-http \
  --header "Authorization: Bearer ${OPENPEEPS_TOKEN}"
openclaw mcp doctor openpeeps-community --probe
```

Or in OpenClaw config (`mcp.servers`):

```json
{
  "mcp": {
    "servers": {
      "openpeeps-community": {
        "url": "https://your-community.example/mcp/community",
        "transport": "streamable-http",
        "headers": {
          "Authorization": "Bearer <your-access-token>"
        }
      }
    }
  }
}
```

Do **not** set `auth: "oauth"` — that ignores the static `Authorization`
header. Prefer an environment variable over a literal token in a committed
file. `openclaw mcp doctor … --probe` opens a live session and lists tools.

<div style="height:20px"></div>

### Hermes

Nous Hermes Agent reads `~/.hermes/config.yaml`. Put the token in
`~/.hermes/.env` as `OPENPEEPS_TOKEN` (or export it) and reference it:

```yaml
mcp_servers:
  openpeeps_community:
    url: "https://your-community.example/mcp/community"
    headers:
      Authorization: "Bearer ${OPENPEEPS_TOKEN}"
    skip_preflight: true
```

`skip_preflight: true` skips Hermes's GET/HEAD content-type probe. A GET to
`/mcp/community` without a Bearer token returns `401`, which can make that
probe fail even though POST MCP works.

Start or reload Hermes (`hermes chat`, or `/reload-mcp` in a session) and ask
it to search the community. `hermes import-agent claude-code` can copy a
Claude Code `.mcp.json` entry into this YAML shape.

<div style="height:20px"></div>

## What the community tools can do

| Tool | What it does |
| ---- | ------------ |
| `search` | Search posts, profiles, groups, events, or jams |
| `list_posts` | List posts, optionally filtered by group, profile, or hashtag |
| `get_post` | Open a post by id |
| `list_groups` | List groups you can see |
| `get_group` | Open a group by id or handle |
| `list_group_members` | List members of a group |
| `get_profile` | Open a profile by id or handle |
| `list_reports` | List reports you can see |
| `get_report` | Open one of those reports |

Community MCP never lists admin tools (`admin_*`). It cannot change
configuration, create backups, or moderate other people's content.

<div style="height:20px"></div>

## If it does not connect

- **401** — the `Authorization: Bearer …` header is missing or the token is
  invalid, expired, or revoked. Create a new token. Also happens if the client
  started an OAuth login instead of sending the header.
- **403** — the token's scopes do not cover that tool. Add the matching read
  scope and create a new token (scopes are baked in at creation time).
- **404** — MCP may be turned off on this community. Ask an administrator.
- OpenClaw connects but tools never appear — `transport` is missing, so it
  used SSE. Set `streamable-http`.
- Hermes refuses the URL after a GET probe — add `skip_preflight: true`.
- The assistant can only see **your** view of the community: private groups
  and posts stay private.

<div style="height:20px"></div>

## Related documentation

- [Administration: MCP for operators](/docs/admin/mcp)
- [Markdown formatting](/docs/user/markdown)
