# Roles and Capabilities

Every profile in your community is assigned a **role**, and each role
grants a set of permissions for what that person can see and do. Six roles
ship by default, and admins can create additional custom roles on top of
these.

Note: OpenPeeps is designed to allow a single account to manage multiple profiles, which will allow us to support a more expansive set of use cases in the future.

<div style="height:20px"></div>

## Default Roles

| Role               | What they can do                                                                                                                                                                                                                                                |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Owner**          | Everything. The community creator (and anyone else promoted to Owner) always has full access, with no restrictions. This includes access to the database and all content stored therein.                                                                        |
| **Admin**          | Manages the community day to day: accounts, reports, groups, posts, profiles, theming/customization, backups, localization, logs, invite links, plugins, and analytics. Can view (but not edit) roles, and can restart the server.                              |
| **Moderator**      | Focused on content and community moderation. They can make announcements; delete and pin posts; suspend profiles; read and act on reports; read accounts, profiles, groups, and invite links. Also has everyday Member abilities (post, create groups/reports). |
| **Member**         | The everyday participant role: create posts (including polls, articles, and events, by default), create groups, send direct messages, and file reports.                                                                                                         |
| **Pending Member** | The default role for a brand-new signup before they're approved or verify their email. They can update they profile and account information and can view local content, but can't post, send direct messages, or join group yet.                                |
| **Limited Member** | The most restricted role. Has no permissions of its own — a Limited Member can only participate in the specific groups they've been added to.                                                                                                                   |

<div style="height:20px"></div>

## Private groups and direct messages

Being an Owner, Admin, or Moderator does not, by itself, grant access to a
private group's content or to anyone's direct messages. Access to a group is
always based on whether that person is actually a member of it — the same
rule applies to every role, including Owner and Admin. Through the OpenPeeps
UI, none of these roles can browse into a private group or read direct
messages they aren't part of.

The one exception is the Owner's ability to export a full backup of the
community (see [Backups](/docs/admin/backups)), which contains all stored
content, including private groups and direct messages.

<div style="height:20px"></div>

Under the hood, each role is defined by a set of granular permissions called
**capabilities**. You don't need to work with these directly — the settings
below cover the adjustments available to admins. Developers can read more at
[Roles and Capabilities (developer reference)](/docs/development/capabilities).

<div style="height:20px"></div>

## Configuring Roles and Capabilities

Go to **Administration → Configuration → Community → Roles and Capabilities**
(`/admin/configuration/community/roles`). The page has three tabs:
**Default role**, **Instance roles**, and **Relationship capabilities**.

### Default role on registration

Choose whether new signups start as **Pending Member** or **Member**. If you
pick Pending Member, new members are automatically upgraded to Member once
they verify their email. An admin can always change an individual member's
role afterward, regardless of this setting.

### Instance roles

The instance roles tab shows a matrix with one column per role and one row
per capability, grouped by area. Click a cell to cycle: **empty → allowed
(+) → denied (−)**. A tilde (`~`) means the capability is allowed through a
wildcard entry (for example `core-posts-*`), and a cross (`×`) means it is
denied through a wildcard and cannot be changed in that cell. Cells that
differ from the role's saved capabilities are highlighted.

- **New role** — creates a custom role. Enter a name (up to 32 characters);
  the role key is derived from it automatically (lowercase letters and
  hyphens, up to 32 characters). New roles start with no capabilities —
  grant them in the matrix. Creating a role whose key already exists fails
  with a "role exists" error.
- **Show/hide roles** — the **Default roles** and **Custom roles** toggles
  and the **Filter roles** field only change which columns are visible;
  hidden roles still count for saving.
- **Save** — persists the changed roles (available while a role differs
  from its saved capabilities).
- **Restore defaults** — loads the system default capabilities for the
  built-in roles (custom roles reset to their last saved state) and
  highlights what would change; press **Save** to apply, or keep editing on
  top of it. A role saved with exactly the system defaults is treated as a
  default role again and receives future default updates. The former "Members
  can create events" and "All Members can create groups" toggles are now part
  of the Member column (`core-posts-create-*` and `core-groups-create`).

When an OpenPeeps update adds capabilities to the default roles, customized
default roles receive the new capabilities automatically on the next server
start — their other edits are kept.

Editing the matrix requires the `core-roles-update` capability (Owner by
default); other admin roles can view it.

### Relationship capabilities

The relationship capabilities tab holds four matrices — **Posts**,
**Profiles**, **Reports**, and **Access tokens** — that control what people
can do based on their relationship to the post author, the profile, the
report, or the token owner, respectively. Each matrix has one column per
relationship type; the first column (**None** = no relationship) applies to
everyone, including signed-in users, and the other columns can override it.
The same cell cycling and `~`/`×` symbols apply. Editing requires the
`core-config-update` capability (Owner by default).

<div style="height:20px"></div>
