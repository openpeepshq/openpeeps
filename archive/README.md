# Archive packages

These packages are **not part of the OpenPeeps runtime**. They exist for
one-time Arango → Postgres cutover of remaining instances.

| Package                            | Path                          | Role                            |
| ---------------------------------- | ----------------------------- | ------------------------------- |
| `@openpeepshq/arango-migrate`      | `archive/arango-migrate`      | Export / import / validate CLI  |
| `@openpeepshq/arango-querybuilder` | `archive/arango-querybuilder` | Historical Arango query builder |

Default Compose and `.env.dev.example` do not start or connect to Arango.
To run a cutover, use `docker-compose.arango.yml` and the migrate CLI.
See `archive/arango-migrate/README.md` and
`platform/core/docs/postgres-migration-runbook.md`.
