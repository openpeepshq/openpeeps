# Roles and Capabilities

For the admin-facing explanation of default roles and the role configuration
UI, see [Roles and Capabilities](/docs/admin/roles) in the admin docs. This
page covers the underlying capability system.

<div style="height:20px"></div>

## Capability strings

A capability is a string of the form `core-<area>-<action>`, e.g.
`core-groups-create` or `core-posts-delete`. Some are wildcards:
`core-posts-create-*` grants creating any post subtype (notes, questions,
articles, events), and `*` (Owner only) grants every action in the system.

Built-in role → capability mappings live in
`platform/common/src/types/roleDefaults.ts`. That file keeps an immutable,
dated history of the defaults (`roleDefaultsHistory`); `defaultRoles` is the
last (current) entry. When the default capabilities change, append a new
entry instead of editing an existing one.

<div style="height:20px"></div>

## Instance roles and custom roles

A role is a document with `key`, `default`, `baseVersion`, `displayName`,
`description`, and `capabilities` (`add`/`remove` lists). `default: true`
marks the built-in roles seeded from `defaultRoles` at server start;
`default: false` marks custom roles created through the admin UI.
`baseVersion` records the defaults history version a built-in role's
capabilities were based on.

Admin API (under `/api/openpeeps/core/v1/admin`):

- `GET /roles`, `GET /roles/:roleId` — list / read (requires
  `core-roles-read`)
- `POST /roles` — create a custom role (requires `core-roles-update`);
  always stores `default: false` and returns 409 if the key exists. Keys
  match `/^[a-z-]{1,32}$/`.
- `PUT /roles/:roleId` — update a role's name, description, capabilities,
  and `baseVersion` (requires `core-roles-update`); storing capabilities
  that exactly match the system defaults marks the role `default: true` and
  re-anchors its `baseVersion` to the current version

Note: `setDefaultRoles` (run on server start, see
`platform/core/src/roles/mutations.ts`) creates missing built-in roles, keeps
roles marked `default: true` in sync with the current factory capabilities
(saved edits to such a role are overwritten on the next server start), and
(re-)marks roles whose capabilities exactly match the system defaults as
`default: true` (re-anchoring their `baseVersion` to the current version) —
so a role restored to the defaults receives future default updates. Roles
marked `default: false` keep their customizations; a built-in
role that carries a `baseVersion` additionally gets the capabilities the
system defaults gained (and lost) since that version merged in, and is
re-anchored to the current version.

The admin UI renders roles and relationships as capability matrices
(`platform/react/src/components/RoleCapabilityMatrix.tsx` and
`RelationCapabilitiesEditor.tsx`, on the shared `CapabilityMatrix`
component; pure helpers in `platform/react/src/lib/capabilityMatrix.ts`).

<div style="height:20px"></div>

## Groups never inherit instance-role capabilities

`getGroupCapabilities` in `platform/common/src/lib/capabilitiesHelpers.ts`
resolves a profile's capabilities for a group purely from their
`GroupRelationship` (their membership role in that specific group, plus
`none`/`local`) — it never merges in the profile's instance-role
capabilities. The same applies to posts with `visibility: 'group'`. This is
intentional (see the comment above `getGroupCapabilities`): instance roles
only gate group _creation_, never per-group access. Because the merge never
happens, this holds even for a profile whose instance role capability is
`*` (Owner) — there is no code path where an instance role grants read
access to a group's content.

<div style="height:20px"></div>

## Gating features by capability

Per `AGENTS.md`: gate features by capability (`core-*`) rather than
hardcoded role checks. Check the acting profile's capability set instead of
comparing `role.key` against `'admin'` or `'moderator'` — this keeps
custom/renamed roles and future role additions working without new code.

<div style="height:20px"></div>
