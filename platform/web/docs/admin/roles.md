# Roles and Capabilities

Every profile in your community is assigned a **role**, and each role
grants a set of permissions for what that person can see and do. Six roles
ship by default.

Note:  OpenPeeps is designed to allow a single account to manage multiple profiles, which will allow us to support a more expansive set of use cases in the future. 

<div style="height:20px"></div>

## Default Roles

| Role | What they can do |
| ---- | ----------------- |
| **Owner** | Everything. The community creator (and anyone else promoted to Owner) always has full access, with no restrictions. This includes access to the database and all content stored therein.|
| **Admin** | Manages the community day to day: accounts, reports, groups, posts, profiles, theming/customization, backups, localization, logs, invite links, plugins, and analytics. Can view (but not edit) roles, and can restart the server. |
| **Moderator** | Focused on content and community moderation.  They can make announcements; delete and pin posts; suspend profiles; read and act on reports; read accounts, profiles, groups, and invite links. Also has everyday Member abilities (post, create groups/reports). |
| **Member** | The everyday participant role: create posts (including polls, articles, and events, by default), create groups, send direct messages, and file reports. |
| **Pending Member** | The default role for a brand-new signup before they're approved or verify their email. They can update they profile and account information and can view local content, but can't post, send direct messages, or join group yet. |
| **Limited Member** | The most restricted role. Has no permissions of its own — a Limited Member can only participate in the specific groups they've been added to. |

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

Go to **Administration → Configuration → Community → Roles & capabilities**
(`/admin/configuration/community/roles`).

### Default role on registration

Choose whether new signups start as **Pending Member** or **Member**. If you
pick Pending Member, new members are automatically upgraded to Member once
they verify their email. An admin can always change an individual member's
role afterward, regardless of this setting.

### Member capabilities

Two checkboxes adjust what the **Member** role can do:

- **Members can create events** — on by default. Turn it off to limit event
  creation to Owners, Admins, and Moderators; Members can still create notes,
  questions, and articles.
- **All Members can create groups** — on by default. Turn it off to limit
  group creation to Owners, Admins, and Moderators.

Both settings only change the Member role's own capabilities — Owners,
Admins, and Moderators can always create events and groups.

<div style="height:20px"></div>
