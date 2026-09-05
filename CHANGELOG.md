Changelog for OpenPeeps
=======================

## Current

### Features

- **post**: add group link on post detail Show the group name as a link in the post detail header so a single post includes a path back to its group. Update i18n and the UI test to target the first matching group link.

### Bug Fixes

- **profile**: update handle conflict message and enhance error handling

### Refactoring

- **poll**: improve layout and structure of PollContent component

### Documentation

- **agents**: stop hardcoding author in commit workflow

## 2026-09-04

### Features

- **events**: add time zone support to event handling
- **emails**: enhance email layout with markdown support
- **sidebar**: add About link for public communities
- **cache**: add clearProfileCache function and update follow/unfollow logic
- **i18n**: add documentation search localization and enhance DocEntry structure
- **markdown**: enhance mention handling in markdown processing
- **badge**: introduce formatBadgeCount function for consistent unread count display
- **invites**: add QR codes with community logo for invite links
- **i18n**: add Markdown help text and update documentation
- **notifications**: integrate cached notifications marking functionality

### Bug Fixes

- **jams**: update error handling and localization for unavailable jams
- **invites**: initialize slug state with random string for unique invite links
- **i18n**: interpolate profile name in hostedBy field

### Refactoring

- **loaders**: replace LoadingIcon with LoadingSpinner and update documentation
- **poll**: improve poll option rendering and voting display

### Documentation

- **releases**: add 19 Aug and 26 Aug narrative notes

## 2026-08-26

### Features

- **cli**: add namespace option to config command
- **events**: add CalDAV-shaped recurring events
- **groups**: add owner role and template-based capability presets
- **sso**: add SSO login URL handling and related utilities
- **backups**: restore into a schema version then migrate forward
- **polls**: implement poll option length validation and UI feedback
- **groups**: enhance group form validation and error handling
- **core**: record createdAt in backup metadata
- **server**: expose lastAccessed from latest post view
- **ui**: standardise dialog cancel and action footer
- **plugins**: theme contract, live reload, and admin install for plugins
- **ui**: show signed-in status on auth layout pages
- **jams**: stream jam A/V to StreamYard over RTMP
- **archive**: introduce ArangoDB cutover tooling and update documentation

### Bug Fixes

- **jams**: use one LiveKit room per event
- **profile**: enhance profile field rendering with links
- **events**: show one upcoming row per recurring event
- **migrate**: enhance migration tests and ensure journal integrity
- **i18n**: use profile settings as language source of truth
- **notifications**: interpolate profile name on new-profile notices
- **ui**: center wrapping button labels on mobile
- **ui**: show notification unread badge in mobile nav
- **web**: prefer light logo for OG and drop unused theme fields
- **jams**: stop guest sessions from refreshing and noisy HTTP calls
- **analytics**: exclude guests from recent signups and use theme chart colors
- **jams**: let guests read profiles for public jam chat
- **admin**: reload page after plugin reload
- **posts**: allow repeated post_seen impression rows
- **analytics**: improve error handling and type safety in cache functions
- **jams**: use plural jams resource type in auth scopes
- **core**: rewrite post and group media hosts on backup restore
- **posts**: preserve group visibility when switching to article
- **jams**: do not rejoin after an intentional leave
- **ui**: link profiles in the post reactions popup
- **ui**: grey out post actions the viewer cannot use
- **i18n**: add missing DE translations for #1240
- **deps**: pin RN host versions and bump react 0.2.5 / rn-components 0.3.1

### Performance

- **posts**: filter my feed before hydration

### Refactoring

- **analytics**: enhance chart and table components for better responsiveness
- **BREAKING**: **rn-components**: publish as @openpeepshq/rn-components

### Documentation

- **releases**: add narrative notes and static nginx publish flow
- **privacy**: retain analytics and post-seen data

## 2026-08-19

### Features

- **posts**: embed capped reposter list on posts
- **analytics**: add per-graph CSV, DAU/MAU, and anonymous click tracking
- **mcp**: add community and ops MCP endpoints
- **profiles**: enhance profiles endpoint with session event handling
- **react-ui**: add selectable OFL community theme fonts
- **poll**: add resolvePollOptionContents function and integrate into post forms
- **examples**: add multi-version component gallery site
- **react-ui**: straighten component framework and Figma tokens

### Bug Fixes

- **analytics**: brand the analytics PDF with the community name
- **poll**: mark the clicked poll option as selected
- **ui**: keep analytics metric values inside the card
- **analytics**: hide DMs and private-group posts from top posts
- **posts**: count and mark unseen reposts by the wrapper row
- **posts**: show tombstones for deleted authors and parents
- **posts**: mark group unread with the same SQL as the badge
- **posts**: exclude deleted authors from unseen counts
- **perf**: speed up inbox unseen counts and conversation APIs
- **tests**: resolve restore-fixture paths from tests or repo root
- **config**: reject empty community profile field keys
- **moderation**: keep reports usable for owners and deleted reporters
- **react-native**: clean up imports and improve Footer component
- **jams**: hide fullscreen when the API is unavailable
- **react-native**: cache hashed media images indefinitely
- **posts**: keep direct jam replies visible in DMs
- **posts**: close media gallery without navigating to the post
- **posts**: mark selected visibility with a primary border
- **admin**: use default variant for community theme save button
- **settings**: use ConfigMenuButton on notification settings
- **settings**: use default variant for theme save button
- **profiles**: drop duplicate following/followers page heading
- **ui**: make SVG avatars fill the circular crop
- **roles**: return updated role so capability save shows success
- **groups**: span group card hover across the full row
- **examples**: build gallery workspace deps including i18n
- **backups**: repoint restored URLs to the full server origin

### Refactoring

- **react-native**: bug fix
- **jams**: enhance layout responsiveness and structure
- update role attributes and semantic elements across components
- **ProfileEventRelationship**: simplify badge rendering logic and integrate Badge component

### Documentation

- **planning**: refresh roadmap timeline snapshot

### Tests

- **session**: cover session SSE fan-out and presence

### CI/CD

- **perf**: keep the fixture API alive across workflow steps
- **perf**: connect Redis and drop GitHub Node actions
- **perf**: set JWT_SECRET so the fixture API can start
- **perf**: run the API performance fixture workflow daily
- pin actions/checkout to the v6.1.0 SHA

### Chores

- **packages**: bump versions for unpublished package changes
- **dev**: add one-command local stack with Mailpit

## 2026-08-12

### Features

- **plugins**: move example plugin to examples/, gate by root package.json
- **docs**: add multi-version docs.openpeeps.org static site
- **react**: streamline profile selection into shared modal
- **perf**: add live and offline performance profiling
- **db**: add migration command and enhance schema readiness checks
- **plugins**: route registration, config endpoint, frontend registry and example
- **analytics**: add rollup-based admin analytics platform
- **config**: update Sentry configuration and documentation for clarity
- **push**: add warning for Brave browser users regarding push notifications

### Bug Fixes

- **posts**: show full image instead of preview in gallery
- **jams**: reconnect admitted guests after mobile idle disconnect
- **jams**: fix mobile jam menu contrast and footer overlap in dark mode
- **profiles**: clarify invalid handle errors on profile save
- **security**: harden LiveKit egress S3 receiver
- **jams**: stop orphan LiveKit rooms from staying Live
- **i18n**: move event location labels into locale file
- **form**: update HeaderAvatarInput to handle null values for header and avatar changes

### Documentation

- **planning**: add regenerable roadmap timeline to 2028
- update frontend docs from Svelte to React
- **db**: prefer Drizzle / SQL-native for new features
- **architecture**: document realtime channel stack
- align migration guidance with Postgres ADR

### CI/CD

- use one floating actions/checkout ref in all workflows

### Chores

- **packages**: rename npm scope from @openpeeps to @openpeepshq
- update ESLint configurations and import paths across multiple libraries

## 2026-08-06

### Bug Fixes

- **groups**: stop plus-button jitter on short group feeds
- **posts**: coerce group-linked posts to visibility group

### Performance

- **posts**: speed up post context with CTE and lean mapping

## 2026-08-06

### Features

- **jams**: stamp instanceDomain on LiveKit room create
- **auth**: allow capability-scoped register when sign-ups are closed
- **react-native**: enhance unread message and post tracking features
- **core**: add SERVER_MAX_PROFILES cap for non-deleted profiles
- **web**: responsive unread indicators and push notification badge sync
- **db**: migrate OpenPeeps from ArangoDB to PostgreSQL

### Bug Fixes

- **ui**: theme audience search input for dark mode
- **jams**: keep observer service JWTs from redirecting to login
- **emails**: restore jam-started notification body for event posts
- **jams**: keep jam recording edge ids aligned with row keys
- **jams**: restore jam recording updates on Postgres edges
- **server**: log Riddl internal errors at error level
- **push**: clear mismatched VAPID subscriptions before resubscribe
- **email**: remove unused renderHostBaseUrl
- **web**: inject community name into SPA Open Graph meta
- **config**: merge admin config PATCH instead of replacing
- **cli**: short-circuit opc JWT secret mint without loading core
- **jams**: restore default LiveKit test SFU URL
- **posts**: load and anonymize deleted authors so DMs open
- **admin**: add role-gated endpoint for deleting groups
- **framework**: update privacy policy text
- **core**: omit empty strings from stored config overrides
- **react**: stop push toggle hang and surface clear errors
- **core**: build post filters with Drizzle queries
- **react**: refresh JWTs earlier and redirect when session ends
- **config**: merge partial config updates instead of replacing them
- **core**: pin @types/node and align workspace on zod 4.4.3
- **react**: update PWA navigation handling and add new utility functions
- **core**: update conversation leaves mapping to sort by creation date
- **core**: stop concurrent migrators from dropping schema mid-import
- **core**: heal incomplete Postgres schema after public wipe
- **core**: remigrate after wipe that left drizzle journal
- **core**: normalize UUID case during Arango→Postgres import
- **core**: validate Arango migrate against post-import counts
- **core**: coerce legacy edge ids and keep failed migrate idle
- **events**: enhance event location resolution and refactor ICS generation
- **core**: harden Arango→Postgres automigration for hashtags
- **jams**: update JamFooter component styling for improved visibility
- **web**: put admin API keys under RootLayout
- **react**: updated various components to improve UX

### Refactoring

- retire SvelteKit and allpeep port residue
- **notifications**: update jam moderator email and notification links

### Tests

- **integration**: fill empty-suite gaps and fix closed-signup 403
- **email**: expand Mailpit coverage and fix settings cache
- **core**: cover db/pg map filters, relations, and capability helpers

### Chores

- update .env.dev.example and documentation for improved configuration clarity
- point repository URLs at code.openpeeps.org

## 2026-07-23

### Features

- **react-ui**: replace loading text with LoadingSpinner animation
- **post**: integrate Popover component for mentions in markdown input

### Bug Fixes

- **post**: fixed  pinned post refetch
- **cleanup**: removed old skeleton theme files
- **HeaderAvatarInput**: add specsText for cover image description
- **form**: enhance FormInput checkbox to support children rendering
- **profiles**: enforce displayName max length on registration
- **poll**: fix undo vote and prevent feed navigation
- **community-favicons**: update button variant for improved UI consistency

### Refactoring

- **groups**: simplify conditional rendering for group actions

### Chores

- **cursor**: enable Figma plugin in workspace settings

## 2026-07-10

### Bug Fixes

- **groups**: restore add-member UI on members and create pages

## 2026-07-09

### Features

- **auth**: add email validation endpoint and update ValidateEmail component

### Bug Fixes

- **pwa**: restore community favicons and dynamic manifest
- **conversations**: update input class for improved focus visibility
- **group-member-card**: enable navigation to member profile on press
- **web**: update sidebar navigation to include overview link
- **input**: update checkbox styling for improved usability
- **notifications**: guard newGroupPost and isolate render failures
- **jams**: make record button clearly indicate recording state
- **i18n**: enhance i18n initialization by creating a new instance and updating the I18nProvider to accept the instance; improve interpolation settings

## 2026-07-03

### Features

- **recordings**: add delete recording functionality
- **events**: implement event capacity
- **web**: migrate in-app docs to React web with build-time markdown
- **admin**: add downloadable members CSV export (#88) Add admin members list CSV download with profile data from the profile cache and batch activity stats via membersExportMapping. API lives in platform/server; React admin UI gets a download button. Document platform/app and platform/svelte as deprecated in AGENTS.md.
- **posts**: add optional jam recording download and reply
- **events**: email an .ics file when a member RSVPs yes/maybe
- **react**: close low-severity Svelte UI parity gaps + i18n reconciliation
- **react**: close medium-severity Svelte UI parity gaps (M1–M54)
- **react**: close high-severity Svelte UI parity gaps (H1–H27)
- **react**: align banner and event image upload with Svelte UI
- **admin**: gate admin menu and routes by role capabilities (#629)
- **react**: align image upload and markdown editing with Svelte

### Bug Fixes

- **context**: replace useEffect with useLayoutEffect in OpenpeepsContextProvider for improved layout handling; add useSetPageHeader in JamEvent for dynamic page title management
- **markdown**: open external links in a new tab
- **jams**: update recording titles
- **post-form**: add autoFocus prop to PostForm and enhance ReplyPost scrolling behavior
- **events**: update class names for event status indicators
- **jams**: streamline JamRoom component logic for capacity and auto RSVP handling
- **auth**: update privacy policy link fallback logic
- **jams**: add hand raise sound notification for participants
- **notifications**: pass FCM project ID and log each push attempt
- **react**: backport stable notification fixes
- **admin**: improve members CSV export feedback (#88)
- **groups**: allow moderator as a group membership role
- **react**: use react-ui UpdatingDate for date and time
- **backups**: stream downloads via /backups route
- **jams**: sync LiveKit theme with app light/dark mode
- **web**: show login error toast on first failed attempt
- **react**: show group name on group join notifications (#878)
- **client**: fixed backup download functionality
- **notifications**: navigate push taps to the correct group (#867)
- **i18n**: add direct message notification strings for settings
- **react-native**: iOS media pick, document sheet, and PDF preview
- **react-native**: attachment upload, preview remove, and iOS file handling
- **react-native**: guard useHasAuthToken for RN and notify credential changes
- **react**: add react-native entry and isolate LiveKit CSS from RN bundles
- **admin**: shorten logs filter placeholder and drop duplicate logs nav (#601)
- **jams**: reduce console errors when starting a jam (#821)
- **reports**: load reported posts for admin moderation (#835)
- **groups**: remove moderator role from group role selection
- **media**: always include full-res HLS variant for VOD transcoding
- **posts**: grant read scope for public post detail access
- **react**: improve video attachment previews
- **react**: enhance layout responsiveness in FeedPost and modals
- **groups**: use admin labels for posting permission radios
- **react**: update JamCallParticipant styles for improved visibility
- **react**: use profile selector for jam moderators on event form
- **react**: simplify DialogFooter components across multiple modals
- **navigation**: streamline logout action in LogoutRow component
- **react**: make event visibility selector look clickable
- **react**: keep page header actions after navigation
- **navigation**: unify sidebar nav link active styles
- **hashtags**: normalize hashtag case for consistency
- **react**: added Inter font and update styles
- **jams**: repair recording start button
- **react**: use modal for moderator jam leave/close choice
- **admin**: double community markdown field limit to 10000 (#773)
- **ci**: install pnpm in runtime image for package publishing

### Refactoring

- **CardEvent**: update link structure and improve accessibility
- **push**: split PushSubscriptionData and PushSubscription schemas PushSubscriptionData is the create payload without id; pushSubscriptionSchema uses modelSchema per variant for API responses. Removes the separate create schema introduced in the prior fix.
- **FullEvent**: removed unnecessary border class
- Move app from svelte-kit to react and riddl

### Documentation

- **agents**: add contributor skills for local run and PR readiness
- **admin**: add OIDC SSO setup guide for server settings
- **agents**: document rebase and single-commit PR requirements

### Chores

- remove Svelte stack and add React greenscreen demo
- **react-native**: update version and enhance document picker functionality
- **web**: sync public static assets from app
- **react-native**: bump package versions for changed dependencies
- **react-native**: bump version to 0.2.23 and enhance profile screen scroll behavior
- **react-native**: upgrade safe-area-context for RN 0.85
- bump version to 0.2.21 and update theme handling in OpenPeepsThemeProvider
- upgrade and sync livekit across openpeeps

## 2026-06-23

### Bug Fixes

- **notifications**: pass FCM project ID and log each push attempt

## 2026-06-23

### Features

- **notifications**: implement Firebase Cloud Messaging credential handling

### Refactoring

- **notifications**: update email notification component to use ExpandedNotification type

## 2026-06-22

### Bug Fixes

- **notifications**: add mention notification template and update email content

## 2026-06-21

### Bug Fixes

- **api**: export allpeep reroute from universal hooks.ts
- **api**: use SvelteKit reroute for /api/allpeep forwarding
- **api**: repair legacy /api/allpeep → /api/openpeeps forwarding

## 2026-06-17

### Refactoring

- **push-subscriptions**: update push subscription schemas and mutation handling

## 2026-06-16

### Features

- **notifications**: comprehensive push delivery logging

## 2026-06-10

### Features

- add OIDC SSO provider support
- **media**: Create better video preview
- **invite-links**: implement group membership validation for invite links
- **admin**: gate administration menu items by role capabilities Replace the bogus check for a non-existent `admin` capability with a shared adminSections map (path + required capabilities per item). Show the Administration parent when any section is visible; render only sections the profile is allowed to access.
- **search**: include attachment alt text and filenames in post search
- **debug**: add debug egress logging and capture scripts for LiveKit sessions
- **theme, modal**: enhance BaseSheet and DateSheet components with theme variables and improve DateTimePicker styling
- **react, react-native**: update versions and add VOD streaming support with new utility functions
- **notification**: add Rsvp type to notification component and types export
- **profile, navigation**: removing local image calss

### Bug Fixes

- **react-native**: send mark-all-seen request when clearing notification badge
- **groups**: exclude instance roles from group post capabilities
- **groups**: scope per-group capabilities to group relationship only
- **invites**: show target groups on admin invite links
- **react-native**: use system photo picker instead of camera roll
- **media**: crop header banners to aspect ratio, cap at 800px, use 3:1 covers
- **notifications**: moving push notifications into a worker thread
- **search**: index array fields for post and profile search-alias views
- **Auth**: update layout structure
- **capabilities**: standardize backup capabilities on plural core-backups-*
- **repo**: remove accidental .worktrees submodule from git index
- **core**: fix anonymous community feed when publicContent is enabled
- **react**: fix refresh logic for react native

### Refactoring

- **debug**: remove debug egress logging and capture scripts for LiveKit sessions
- **tab-screens-header**: improve layout

### Documentation

- add AGENTS.md and Claude Code shim

### CI/CD

- **changelog**: drop tag job from regenerate-changelog
- **changelog**: drop build job from regenerate-changelog
- **changelog**: push with dedicated CHANGELOG_USER/CHANGELOG_TOKEN
- **changelog**: push with Actions token instead of registry PAT
- **changelog**: push to main with container registry credentials
- **changelog**: revert to direct push to main
- **changelog**: regenerate changelog via PR instead of direct push to main

### Chores

- **notification**: update NotificationWrapper component layout and styles
- **changelog**: update CHANGELOG.md with new features, bug fixes, and refactoring details
- **react, react-native**: refactor MediaPreview and add attachment processing tracking
- **react-native**: bump version to 0.2.16 and enhance MediaPreview component with video preview handling
- **react, react-native**: update package versions and enhance OpenpeepsProvider for React Native support
- **package**: update package versions for fetch-client, client, common, react, and react-native

## 2026-05-29

### Features

- **backups**: enhance backup and restore functionality with timeout handling and validation checks
- **auth, group**: add member-only post visibility check and enhance capabilities for group members
- **api-keys**: Implement the possibility for personal and service access total
- **event**: implement dynamic event visibility labels in FullEvent component for React Native and Svelte
- **image-input**: enhance ImageInput component with aspect ratio cropping functionality
- **media**: implement upload progress tracking for media attachment              implement streaming API for video on demand
- **PostMenu**: implement bookmark functionality with loading state and dropdown menu integration

### Bug Fixes

- **cleanup**: Replaces AllPeeP logos with OpenPeeps logos.
- **GroupPageHeader**: adjust header image styling for improved layout
- **sidebar**: close drawer on MenuItem link click for improved navigation experience
- **conversations**: stop mutating state inside derived avatar layout
- **backups**: Prevent unzip pipe deadlock during large backup restore
- **backups**: Fix restore of very large backups
- **service-worker**: improve notification click handling to support dynamic URLs and enhance navigation logic
- **MediaPreview**: enhance image and document rendering logic in MediaPreview component
- **groups**: correct profile reference in RemoveAdminPrivileges modal
- **MediaPreview**: change XIcon color from white to foreground for better visibility
- **logs**: update timestamp format to UTC in logs diagnostics
- **email**: improve error handling in SMTP test email functionality
- **OpenPeepsMarkdown**: enhance link handling with newTab option and internal link detection
- **workflows**: update job dependencies in build.yaml
- **ConfigCommunityFavIcons**: remove mobile icon handling from community configuration
- **react-native**: fixing send icon positioning
- **react-native**: update version to 0.2.6 and adjust PostActions text based on post type

### Refactoring

- **notifications**: update styling for push-enabled devices and delete modal for improved UI consistency
- **post-menu**: update bookmarking logic to handle reposts correctly
- **notifications**: enhance notification handling and badge management
- **jams**: wrap display name in ThemedView for improved styling
- **message-card**: comment out reaction handling code and button component
- **participant-view**: simplify layout and styling for video and avatar components
- **svelte**: updated log page to show absolute date

### Chores

- **jams**: changing emoji set to emoji package
- **tsconfig**: add noCheck option to TypeScript configuration for improved build performance
- **build**: increase Node.js memory limit and update TypeScript configuration for better compatibility
- **deps**: update package manager to pnpm@11.1.3 and enable corepack for dependency management
- **react-native**: bump version to 0.2.8
- **react-native**: bump version to 0.2.6 and simplify Notifications component structure

## 2026-05-19

### Features

- **workflows**: add weblate PR workflow and refine build steps
- **workflows**: enhance build and Weblate squash PR workflows with SHA override support
- **workflows**: add Weblate squash PR workflow and enhance squash script for CI
- **event**: use UpdatingDate for jam attendee creation timestamps
- **i18n**: add German (de) translation
- **posts**: add post seen tracking backend
- **i18n**: add "View members" string to English locale
- **sidebar**: removed submenu and added to main menu
- **community**: add code of conduct page and update related configurations
- **fetch-client**: add support for AbortSignal in request handling
- **EventMenu**: add delete post functionality with modal confirmation
- **about**: add noRedirect prop to AuthLayout for conditional rendering
- **react-native**: update media handling and document picker functionality
- **workflows**: add commit check job to CI pipeline
- **tests**: add UI test fixtures and initial test cases
- **posts**: enhance feed filtering with group membership support
- **cli**: add community config command for managing configuration values
- **backups**: enhance backup and restore functionality with hostname management
- **api**: add current stats endpoint for OpenPeeps
- **cli, api**: rename CLI to OpenPeeps and add stats command

### Bug Fixes

- **workflows**: ignore 'weblate' branch in build workflow triggers
- **workflows**: enhance build and changelog workflows with repository input for image tagging
- **workflows**: update build.yaml to use github.repository for consistent image tagging
- **workflows**: update Weblate squash PR workflow to use Node.js image and install jq
- **urlFetcher**: update user-agent string from AllPeeP to OpenPeeps
- **groups**: fixed groups capabilities check
- **post**: fixing hashtags
- **fetch-client**: improve error handling in fetch response parsing
- **react-native**: revert misguided debug attempts

### Refactoring

- **workflows**: update Weblate squash PR workflow for improved branch handling
- **workflows**: improve SHA resolution and build steps in build.yaml
- **workflows**: update build and Weblate squash PR workflows for improved SHA handling
- **event**: update navigation and enhance FullEvent component structure
- **react-native**: update import paths and TypeScript configuration
- **react-native**: introduced full set of react native components

### Tests

- **auth**: enhance user registration test with dynamic data and improved error reporting

### CI/CD

- **forgejo**: rename nightly workflow and allow manual changelog runs

### Chores

- **workflows**: remove 'weblate' branch from build workflow triggers
- **react-native**: Fixing video player
- **dependencies**: update package versions and improve media cache handling
- **react-native**: bump version to 0.2.1 and enhance navigation logic
- **npm**: consolidate hoisting rules in root .npmrc and remove redundant react-native .npmrc
- **workflows**: simplify npm configuration for package publishing in CI
- **workflows**: enhance npm package publishing configuration in CI workflow
- **react-native**: update prepublishOnly script for targeted build process
- **workflows**: add pnpm install step to CI workflow for dependency management
- **workflows**: remove redundant build steps from CI workflow and remove hardcoded registry from react-native package.json
- **docker**: enhance Dockerfile and CI workflow for compatibility
- **docker**: streamline Dockerfile commands and add smoke test script
- **workflows**: adjust npm package publishing environment
- **react-native**: refine TypeScript exclusion patterns in configuration files
- **react-native**: update TypeScript configuration for improved module resolution
- **react-native**: update TypeScript configuration to include baseUrl and paths
- **workflows**: Build all packages before publish
- **react-native**: bump version to 0.2.0 in package.json

## 2026-04-24

### Features

- **api**: add GET and PATCH endpoints for account management

### Bug Fixes

- update config namespaces from 'allpeep' to 'openpeeps'
- **translations**: adding viewMembers translation

### Chores

- **i18n**: enhance translations across various components

## 2026-04-15

### Bug Fixes

- replace config namespaces where it was still allpeep
- enforce integer-only y-axis on signup chart

### Chores

- update dependencies in pnpm-lock.yaml and package.json, upgrade @types/node to 24.1.0
- renaming apat to OpenPeeps, put back .env.dev.example file.

## 2026-03-28

### Bug Fixes

- **docker**: renamed docker file
- **ci**: Correct npm registry owner name in build workflow

### Chores

- **ci**: Remove timezone specification from nightly workflow and update image tag syntax
- **ci**: Update workflows and scripts for changelog generation and branch checks
- **ci**: Update actions/checkout to v6 and fix changelog generation condition
- **ci**: Enhance build workflow with concurrency and release branch checks
- **ci**: Fix ci build workflow

