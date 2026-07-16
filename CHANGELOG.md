Changelog for OpenPeeps
=======================

## Current

### Features

- **post**: integrate Popover component for mentions in markdown input

### Bug Fixes

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

