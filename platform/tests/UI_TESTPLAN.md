# OpenPeeps UI test plan

Checklist of **browser user interactions** that should be covered by automated
UI tests (Playwright). This is not a claim of current coverage.

**Sources:** `platform/web/src/App.tsx`, `platform/react`, admin gates in
`platform/common/src/lib/adminSections.ts`.

## How to read

| Column | Meaning |
|--------|---------|
| ID | Stable case id for tracking |
| Interaction | Concrete user action / flow |
| Preconditions | Role, config, or seed required |
| Expected | Observable outcome |
| Notes | Suite hints / env notes |

Roles used below:

- **guest** — no session
- **member** — authenticated local profile
- **owner** — community owner (broad admin caps)
- **group-admin** — group role with manage caps

Existing suite folders (for gap awareness only): `suites/empty/ui`,
`suites/empty/user-actions`, `suites/empty/email-push`, `suites/public`,
`suites/sso`, `suites/jams`, `suites/default`.

---

## 1. Access matrix

| ID | Interaction | Preconditions | Expected | Notes |
|----|-------------|---------------|----------|-------|
| UI-ACCESS-01 | Open `/` as guest | `publicContent=true` | Redirect or land on `/feeds/local` | `suites/public` |
| UI-ACCESS-02 | Open `/` as guest | `publicContent=false` | Redirect to `/auth/login` | |
| UI-ACCESS-03 | Open `/feeds/my` as guest | private community | Redirect to login | |
| UI-ACCESS-04 | Open `/feeds/local` as guest | public community | Feed visible without login | |
| UI-ACCESS-05 | Open `/admin` as member without caps | member JWT | Access denied / redirect home | |
| UI-ACCESS-06 | Open `/admin/members` as owner | owner | Members page | |
| UI-ACCESS-07 | Jams nav visibility | LiveKit disabled | Jams entry hidden | |
| UI-ACCESS-08 | Jams nav visibility | LiveKit enabled | Jams entry visible | |
| UI-ACCESS-09 | Event create entry | member without owner create path | Composer/event switch gated | owner-gated create |
| UI-ACCESS-10 | Group post reply/react as non-member | group post, outsider | Actions disabled / blocked | |
| UI-ACCESS-11 | Direct URL to gated admin section | missing section caps | Denied + home link | `RequireAdminSection` |

---

## 2. Auth

| ID | Interaction | Preconditions | Expected | Notes |
|----|-------------|---------------|----------|-------|
| UI-AUTH-01 | Login with valid email/password | seeded account | Lands on feed or `?redirect=` | empty/ui |
| UI-AUTH-02 | Login with bad password | seeded account | Error, stay on login | |
| UI-AUTH-03 | Toggle password visibility | login page | Password shown/hidden | |
| UI-AUTH-04 | Follow “Forgot password” | login page | `/auth/request-reset-password` | |
| UI-AUTH-05 | Request password reset | valid email | Success toast; Mailpit has email | email-push |
| UI-AUTH-06 | Open reset link → set new password | Mailpit link | Password updated; can login | |
| UI-AUTH-07 | Register open community | open registration | Account created → `/welcome` | empty/ui |
| UI-AUTH-08 | Register when closed | closed registration | Redirect `/auth/closed` | |
| UI-AUTH-09 | Register via invite | invite link/code | Registration succeeds | |
| UI-AUTH-10 | Register duplicate email/handle | existing user | Validation error | |
| UI-AUTH-11 | Accept privacy checkbox required | register form | Submit blocked until checked | |
| UI-AUTH-12 | Validate email via link | validation email | Success toast / verified state | |
| UI-AUTH-13 | OIDC SSO login | SSO suite + provider | Authorize → callback → feed | `suites/sso` |
| UI-AUTH-14 | OIDC pending / error | failed SSO | Pending page → back to login | |
| UI-AUTH-15 | Generic SSO callback | `/auth/sso/generic` | Token stored → app | |
| UI-AUTH-16 | Logout from sidebar | authenticated | Cleared session → login | |
| UI-AUTH-17 | Login after Stripe success return | `?payment=success` | Success toast | Stripe env |
| UI-AUTH-18 | Login after Stripe cancel | `?payment=cancel` | Cancel toast | Stripe env |
| UI-AUTH-19 | “See community feed” from login | publicContent | Navigates to public feed | |
| UI-AUTH-20 | “Join community” from login | open regs | Navigates to register | |

---

## 3. Shell / navigation

| ID | Interaction | Preconditions | Expected | Notes |
|----|-------------|---------------|----------|-------|
| UI-SHELL-01 | Sidebar: Community feed | member | `/feeds/local` | |
| UI-SHELL-02 | Sidebar: My feed | member | `/feeds/my` | |
| UI-SHELL-03 | Sidebar: Bookmarks | member | `/feeds/bookmarks` | |
| UI-SHELL-04 | Sidebar: Groups / Events / Explore / Members / DMs | member | Correct routes | |
| UI-SHELL-05 | Mobile footer: community / my / compose / notifications | viewport mobile | Each target works | |
| UI-SHELL-06 | Mobile drawer opens nav | mobile | Full nav accessible | |
| UI-SHELL-07 | Admin sidebar expand/collapse | owner | Sections toggle | |
| UI-SHELL-08 | Open `/about` | any | Community about markdown | |
| UI-SHELL-09 | Open `/code-of-conduct` | any | CoC content | |
| UI-SHELL-10 | Open `/docs` and a docs child | any | Docs layout + page | |
| UI-SHELL-11 | Unknown route | any | 404 page | |
| UI-SHELL-12 | Welcome page after register | new account | `/welcome` content | |

---

## 4. Feeds & posts

| ID | Interaction | Preconditions | Expected | Notes |
|----|-------------|---------------|----------|-------|
| UI-POST-01 | Open compose (FAB / New note) | member | `NewPostModal` opens | |
| UI-POST-02 | Publish note (markdown) | member | Post appears in local feed | empty/ui |
| UI-POST-03 | Compose with hashtag | member | Tag linkable; `/tags/:hashtag` works | |
| UI-POST-04 | Compose with @mention | member + target profile | Mention resolves | |
| UI-POST-05 | Switch type to poll → add options + expiry → publish | member | Poll post created | |
| UI-POST-06 | Switch type to event → navigate create | owner | `/events/new` | |
| UI-POST-07 | Switch type to article → navigate create | member with cap | `/articles/new` | |
| UI-POST-08 | Set audience public/local/group/direct | member | Audience reflected on post | |
| UI-POST-09 | Announce post (admin) | owner + announce cap | Announcement applied | |
| UI-POST-10 | Attach image/media → publish | member | Attachment visible; gallery opens | |
| UI-POST-11 | URL preview card in composer | member | Preview card shown | |
| UI-POST-12 | Open post detail | published post | `/posts/:id` + thread | |
| UI-POST-13 | Reply from footer / reply modal | member | Reply appears in thread | often API-tested |
| UI-POST-14 | React 👍 then unreact | member | Count toggles | |
| UI-POST-15 | Repost then unrepost | member | Repost state toggles | |
| UI-POST-16 | Bookmark then unbookmark | member | Appears/disappears in bookmarks feed | |
| UI-POST-17 | View reactions modal | reacted post | Modal lists reactors | |
| UI-POST-18 | View reposts modal | reposted post | Modal lists reposters | |
| UI-POST-19 | Follow author from post menu | other author’s post | Following state updates | |
| UI-POST-20 | Edit own note | owner of post | Content updated | |
| UI-POST-21 | Delete own post (confirm) | owner of post | Removed from feed | |
| UI-POST-22 | Pin post globally | `core-config-update` | Pinned in community | |
| UI-POST-23 | Unpin global pin | pinned post | Pin cleared | |
| UI-POST-24 | Pin post in group | group pin cap | Group pinned post set | |
| UI-POST-25 | Report post | member | Report submitted confirmation | |
| UI-POST-26 | Share: copy link | post | Clipboard / success feedback | |
| UI-POST-27 | Share: send in DM | member + recipient | DM thread opened/prefilled | |
| UI-POST-28 | Share event: download ICS | event post | ICS download starts | |
| UI-POST-29 | Vote on poll | poll post + member | Vote recorded | |
| UI-POST-30 | Undo poll vote | voted poll | Vote cleared | |
| UI-POST-31 | Play video attachment | video post | Player starts | |
| UI-POST-32 | Articles list → create → edit | article caps | CRUD via article pages | |
| UI-POST-33 | Infinite scroll / load more feed | many posts | Older posts load | |
| UI-POST-34 | Mark posts seen (unseen counts) | unread posts | Unseen badge decreases | |

---

## 5. Profiles & members

| ID | Interaction | Preconditions | Expected | Notes |
|----|-------------|---------------|----------|-------|
| UI-PROF-01 | Open profile via `@handle` | existing profile | Profile header + posts | |
| UI-PROF-02 | Open unknown handle | — | 404 / not found | empty/ui |
| UI-PROF-03 | Switch profile tabs (posts/groups) | profile with both | Content switches | |
| UI-PROF-04 | Open followers list | profile with followers | `/@handle/followers` | |
| UI-PROF-05 | Open following list | profile following others | `/@handle/following` | |
| UI-PROF-06 | Follow then unfollow | other profile | Button state toggles | |
| UI-PROF-07 | Own profile “Edit” | self | Navigates settings public profile | |
| UI-PROF-08 | Message user from profile | other profile | Create-conversation with recipient | |
| UI-PROF-09 | Copy profile link | profile menu | Link copied | |
| UI-PROF-10 | Report profile | other profile | Report submitted | |
| UI-PROF-11 | Members directory search | `/members` | Cards filter; follow works | |

---

## 6. Settings

| ID | Interaction | Preconditions | Expected | Notes |
|----|-------------|---------------|----------|-------|
| UI-SET-01 | Open settings hub | member | Links to all sections | smoke |
| UI-SET-02 | Edit public profile (name/handle/bio) | member | Saved; profile updated | |
| UI-SET-03 | Upload avatar / header | member | Images update | |
| UI-SET-04 | Change password | current password known | Success; re-login works | |
| UI-SET-05 | Change email | account page | Validation email path | Mailpit |
| UI-SET-06 | Notification preferences save | member | Prefs persist after reload | |
| UI-SET-07 | Send test notification | prefs page | Toast / delivery side-effect | |
| UI-SET-08 | Remove push-enabled device | listed device | Device removed after confirm | |
| UI-SET-09 | Change theme | member | Theme applied + persisted | |
| UI-SET-10 | Change language | member | UI language updates | |
| UI-SET-11 | Create personal access token | member | Token shown once; copy works | |
| UI-SET-12 | Revoke access token | existing token | Token removed | |
| UI-SET-13 | Open billing / Stripe portal | Stripe membership on | Portal opens or redirect | env |
| UI-SET-14 | Billing hidden when Stripe off | Stripe membership off | Redirect away | |

---

## 7. Notifications

| ID | Interaction | Preconditions | Expected | Notes |
|----|-------------|---------------|----------|-------|
| UI-NOTIF-01 | Open notifications from bell | unread items | List shown; mark-all-seen | |
| UI-NOTIF-02 | Click follow notification | follow event | Navigates to profile | |
| UI-NOTIF-03 | Click reply/mention notification | post event | Navigates to post | |
| UI-NOTIF-04 | Click DM notification | DM event | Navigates to conversation | |
| UI-NOTIF-05 | Click group notification | group event | Navigates to group | |
| UI-NOTIF-06 | Click jam notification | jam event | Navigates to jam/event | |
| UI-NOTIF-07 | Badge clears after mark-seen | badged app | Badge cleared | PWA |

---

## 8. Groups

| ID | Interaction | Preconditions | Expected | Notes |
|----|-------------|---------------|----------|-------|
| UI-GRP-01 | List / search groups | groups exist | Index filters | |
| UI-GRP-02 | Create group (all fields) | `core-groups-create` | Group show page | empty/ui |
| UI-GRP-03 | Create group visibility variants | create cap | Public/private/join rules applied | |
| UI-GRP-04 | Open group show tabs | group | Posts / events / description | |
| UI-GRP-05 | Join group | joinable group | Membership granted | |
| UI-GRP-06 | Leave group | member, not last admin | Membership removed | |
| UI-GRP-07 | Leave blocked as last admin | sole group admin | Error / blocked | |
| UI-GRP-08 | Edit group | group-admin | Fields updated | |
| UI-GRP-09 | Delete group (confirm) | delete cap | Group gone | |
| UI-GRP-10 | Add members via modal | group-admin | Members appear | |
| UI-GRP-11 | Change member roles | group-admin | Roles updated | |
| UI-GRP-12 | Remove member | group-admin | Member removed | |
| UI-GRP-13 | Mark all posts read | member | Unseen cleared for group | |
| UI-GRP-14 | Share group | group page | Share/copy works | |
| UI-GRP-15 | Compose post from group page | member allowed to post | Group audience preselected | |
| UI-GRP-16 | Open group info / members routes | group | `/info`, `/members` | |

---

## 9. Events

| ID | Interaction | Preconditions | Expected | Notes |
|----|-------------|---------------|----------|-------|
| UI-EVT-01 | List events / my events | events exist | Upcoming/past sections | |
| UI-EVT-02 | Create event (in-person) | owner/create path | Event published | empty/ui |
| UI-EVT-03 | Create online / jam-type event | create path | Type persisted | |
| UI-EVT-04 | Edit event | event owner | Fields updated | |
| UI-EVT-05 | Duplicate event | event menu | `/events/new` with draft | |
| UI-EVT-06 | Delete event | event owner | Removed | |
| UI-EVT-07 | RSVP yes | member | Yes state | |
| UI-EVT-08 | RSVP tentative | member | Tentative state | |
| UI-EVT-09 | RSVP no | member | No state | |
| UI-EVT-10 | RSVP at capacity | full event | Capacity messaging | |
| UI-EVT-11 | Join jam from event | jam event + LiveKit | Navigates jam room | jams |

---

## 10. Jams (LiveKit-dependent)

| ID | Interaction | Preconditions | Expected | Notes |
|----|-------------|---------------|----------|-------|
| UI-JAM-01 | Open jams index / my jams | LiveKit on | Lists live/upcoming | |
| UI-JAM-02 | Create jam-named event | create path | Jam appears | |
| UI-JAM-03 | Lobby: guest form if needed | guest-pass path | Can continue | |
| UI-JAM-04 | Lobby: toggle mic/camera + device pick | lobby | Devices selected | WebRTC |
| UI-JAM-05 | Join room | capacity OK | In-room UI | `suites/jams` UI gap |
| UI-JAM-06 | Capacity / request-to-join gate | full room | Waiting / request UI | |
| UI-JAM-07 | Host admit waiting participant | host | Participant joins | |
| UI-JAM-08 | Mute / video toggle in room | participant | Local A/V state changes | |
| UI-JAM-09 | Background blur | participant | Blur toggles | |
| UI-JAM-10 | Raise hand | participant | Hand visible to others | |
| UI-JAM-11 | Screen share | participant | Share starts/stops | |
| UI-JAM-12 | Emoji reactions | participant | Reaction shown | |
| UI-JAM-13 | Chat drawer send/receive | two participants | Messages appear | |
| UI-JAM-14 | People drawer | participant | Roster visible | |
| UI-JAM-15 | Details drawer | participant | Event details | |
| UI-JAM-16 | Leave jam | participant | Returns to lobby/list | |
| UI-JAM-17 | Host close jam | host/moderator | Room closed | |
| UI-JAM-18 | Start/stop recording | record enabled + mod | Recording state | |
| UI-JAM-19 | Observer shell | observer link | View-only path | |

---

## 11. Conversations (DMs)

| ID | Interaction | Preconditions | Expected | Notes |
|----|-------------|---------------|----------|-------|
| UI-DM-01 | Open conversations index | member | Thread list | smoke |
| UI-DM-02 | Unread pills in nav | unread DMs | Badge visible | |
| UI-DM-03 | Create conversation (pick profiles) | member + targets | Thread created | |
| UI-DM-04 | Send message (≤500 chars) | open thread | Message appears | |
| UI-DM-05 | Reject / trim overlong message | >500 chars | Validation | |
| UI-DM-06 | Open thread marks seen | unread thread | Unread cleared | |
| UI-DM-07 | Thread info page | conversation | Participants listed | |
| UI-DM-08 | Share post into DM | share menu | Prefill with URL | |

---

## 12. Search / explore

| ID | Interaction | Preconditions | Expected | Notes |
|----|-------------|---------------|----------|-------|
| UI-SEARCH-01 | Explore search hit | matching content | Results in active tab | empty/ui |
| UI-SEARCH-02 | Explore search miss | no match | Empty state | |
| UI-SEARCH-03 | Tab: posts | `q` set | Posts results | |
| UI-SEARCH-04 | Tab: members/profiles | `q` set | Profile cards | |
| UI-SEARCH-05 | Tab: jams | `q` set | Jam results | |
| UI-SEARCH-06 | Tab: events | `q` set | Event results | |
| UI-SEARCH-07 | Tab: groups | `q` set | Group results | |
| UI-SEARCH-08 | Infinite scroll results | many hits | More load | |
| UI-SEARCH-09 | Click result cards | results | Navigate to entity | |
| UI-SEARCH-10 | Hashtag page | `/tags/:hashtag` | Tagged posts | |

---

## 13. Reports (user)

| ID | Interaction | Preconditions | Expected | Notes |
|----|-------------|---------------|----------|-------|
| UI-REP-01 | Report post as spam | `core-reports-create` | Success | |
| UI-REP-02 | Report post as violation | same | Success | |
| UI-REP-03 | Report post as other | same | Success | |
| UI-REP-04 | Report profile | same | Success | |
| UI-REP-05 | Cancel report modal | opened modal | No report created | |

---

## 14. Admin

Gates: `adminSections` in `platform/common/src/lib/adminSections.ts`.

| ID | Interaction | Preconditions | Expected | Notes |
|----|-------------|---------------|----------|-------|
| UI-ADM-01 | Dashboard `/admin` | any admin section | Overview loads | |
| UI-ADM-02 | Members: search | members section | Rows filter | |
| UI-ADM-03 | Members: CSV download | members section | File download | |
| UI-ADM-04 | Members: edit email | account update cap | Email updated | |
| UI-ADM-05 | Members: edit roles | roles update cap | Roles saved | |
| UI-ADM-06 | Members: delete profile | profiles delete | Profile removed | |
| UI-ADM-07 | Members: delete account | accounts delete | Account removed | |
| UI-ADM-08 | Members: new invite (link) | invite create | Link created/copied | |
| UI-ADM-09 | Members: new invite (email) | invite create | Email sent (Mailpit) | |
| UI-ADM-10 | Invites page manage activate/deactivate | invites section | State toggles | |
| UI-ADM-11 | Admin groups list | groups read | Cards listed | |
| UI-ADM-12 | Admin groups create → `/groups/new` | create | Form opens | |
| UI-ADM-13 | Admin groups members | groups | Members view | |
| UI-ADM-14 | Admin groups delete | `core-groups-delete` | Group deleted | |
| UI-ADM-15 | Moderation list tabs/filters | reports read | Open/resolved filters | |
| UI-ADM-16 | Resolve report: ignore | reports update | Resolved | |
| UI-ADM-17 | Resolve report: remove post/profile | reports update | Content removed + resolved | |
| UI-ADM-18 | Reopen report | resolved report | Open again | |
| UI-ADM-19 | Per-handle reports route | moderation | Filtered list | |
| UI-ADM-20 | API keys: create + copy | serviceTokens create | Token shown once | |
| UI-ADM-21 | API keys: revoke | existing token | Revoked | |
| UI-ADM-22 | Backups: create | backups create | Backup appears | |
| UI-ADM-23 | Backups: download | backups download | Zip download | |
| UI-ADM-24 | Backups: restore upload | backups restore | Restore starts | destructive |
| UI-ADM-25 | Analytics page | analytics read | Charts/view render | |
| UI-ADM-26 | Configuration hub → server settings save | config update | Persists | |
| UI-ADM-27 | Community: info / language / theme save | config update | Persists | |
| UI-ADM-28 | Community: favicons / profile fields / about / CoC / welcome | config update | Persists | |
| UI-ADM-29 | Community: roles / links / welcome email / welcome page | config update | Persists | |
| UI-ADM-30 | i18n overrides save | i18n update | Overrides persist | |
| UI-ADM-31 | Email configuration test | config | Test email in Mailpit | |
| UI-ADM-32 | Diagnostics index | config read | Page loads | |
| UI-ADM-33 | Diagnostics: email queue test/stats | diagnostics | Stats + test OK | |
| UI-ADM-34 | Diagnostics: logs | logs read | Log rows | |
| UI-ADM-35 | Diagnostics: job detail | known job | Detail shown | |
| UI-ADM-36 | DB explorer: list tables | `core-db-access` | Tables listed | |
| UI-ADM-37 | DB explorer: browse/filter/paginate rows | db access | Rows shown | |
| UI-ADM-38 | DB explorer: edit row | db access | Row updated | |
| UI-ADM-39 | DB explorer: CSV export | db access | Download | |
| UI-ADM-40 | DB explorer: run SQL | db access | Result/error shown | careful |
| UI-ADM-41 | Access denied for each admin section | missing caps | Denied UI | matrix |

---

## 15. Payments

| ID | Interaction | Preconditions | Expected | Notes |
|----|-------------|---------------|----------|-------|
| UI-PAY-01 | Login/register redirects to Stripe checkout | paid membership on | External checkout URL | env |
| UI-PAY-02 | `/payment/success` polls then continues | completed session | Welcome or feed | |
| UI-PAY-03 | Cancel return toast | cancel URL | Cancel feedback on login | |
| UI-PAY-04 | Settings billing portal | Stripe customer | Portal opens | |

---

## 16. PWA / install / push

| ID | Interaction | Preconditions | Expected | Notes |
|----|-------------|---------------|----------|-------|
| UI-PWA-01 | Service worker registers | PROD build | SW active | PROD only |
| UI-PWA-02 | Install prompt CTA | `beforeinstallprompt` | Install flow | |
| UI-PWA-03 | Update available → reload | new SW | Update prompt works | |
| UI-PWA-04 | Notification permission prompt | browser prompt | Grant/deny handled | |
| UI-PWA-05 | Opening notifications bell subscribes push | permission granted | Subscription created | push-catcher |

---

## Suite mapping appendix

| Area | Closest existing suite coverage |
|------|----------------------------------|
| Auth login/register | `empty/ui`, `empty/auth/register` |
| Password reset / email validate | `empty/email-push`, user-actions |
| SSO | `suites/sso` |
| Public guest feeds | `suites/public` |
| Create note/group/event/explore | `empty/ui` (partial) |
| Reply/react/bookmark/edit/delete/RSVP/DM | mostly `empty/user-actions` (API) |
| Jam token/room API | `suites/jams` (little/no WebRTC UI) |
| Admin / Stripe / pin / poll vote UI | largely gaps |
| Default fixture smoke | `suites/default` |

---

## Out of scope / env-dependent

- Live Stripe charges against production keys
- Jam WebRTC quality / multi-peer A/V performance (use loadtest harness)
- Native iOS/Android push (web push-catcher only)
- Dev-only routes (`/test/markdown`, `/test/error`) unless used for tooling
- Visual pixel-perfect regression (not required for this functional plan)
