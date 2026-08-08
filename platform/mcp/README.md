# @openpeepshq/mcp

Thin Model Context Protocol (MCP) servers for OpenPeeps. Tools call the
existing HTTP API with the caller’s Bearer token — there is no second
`@openpeepshq/core` bootstrap path.

## Endpoints

Mounted on the API process when `OPENPEEPS_MCP` is not `0`:

| URL              | Profile                 | Typical token       |
| ---------------- | ----------------------- | ------------------- |
| `/mcp/community` | Curated member APIs     | User or service JWT |
| `/mcp/ops`       | Curated `/admin/*` APIs | Admin-capable JWT   |

Disable with `OPENPEEPS_MCP=0`. Override the in-process API origin with
`OPENPEEPS_MCP_API_BASE` (default `http://127.0.0.1:$PORT`).

## Cursor (HTTP)

Point Cursor at the community or ops Streamable HTTP URL and pass a Bearer
token your identity is allowed to use:

```json
{
  "mcpServers": {
    "openpeeps-community": {
      "url": "https://your-community.example/mcp/community",
      "headers": {
        "Authorization": "Bearer <user-or-service-jwt>"
      }
    },
    "openpeeps-ops": {
      "url": "https://your-community.example/mcp/ops",
      "headers": {
        "Authorization": "Bearer <admin-capable-jwt>"
      }
    }
  }
}
```

Community clients never list ops tools (`admin_*`). Capability checks still
happen in the API.

## Cursor (stdio, local)

```bash
OPENPEEPS_TOKEN=<jwt> \
OPENPEEPS_API_BASE=https://your-community.example \
pnpm --filter @openpeepshq/mcp exec openpeeps-mcp --profile community
```

## Escape hatch

If ops needs a capability the admin HTTP API does not expose:

1. Add a role-gated admin endpoint (and BullMQ job if the work is long-running).
2. Wrap it as a thin MCP tool here.

Do **not** add an in-process `@openpeepshq/core` MCP unless the work is
inherently non-HTTP and cannot be expressed as an admin enqueue/API.
