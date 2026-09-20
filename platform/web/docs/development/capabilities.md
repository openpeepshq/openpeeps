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

Default role → capability mappings live in
`platform/core/src/roles/defaults.ts`.

<div style="height:20px"></div>

## Groups never inherit instance-role capabilities

`getGroupCapabilities` in `platform/common/src/lib/capabilitiesHelpers.ts`
resolves a profile's capabilities for a group purely from their
`GroupRelationship` (their membership role in that specific group, plus
`none`/`local`) — it never merges in the profile's instance-role
capabilities. The same applies to posts with `visibility: 'group'`. This is
intentional (see the comment above `getGroupCapabilities`): instance roles
only gate group *creation*, never per-group access. Because the merge never
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
