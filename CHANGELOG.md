Changelog for OpenPeeps
=======================

## Current

### Features

- **invite-links**: implement group membership validation for invite links
- **admin**: gate administration menu items by role capabilities Replace the bogus check for a non-existent `admin` capability with a shared adminSections map (path + required capabilities per item). Show the Administration parent when any section is visible; render only sections the profile is allowed to access.
- **search**: include attachment alt text and filenames in post search
- **debug**: add debug egress logging and capture scripts for LiveKit sessions
- **theme, modal**: enhance BaseSheet and DateSheet components with theme variables and improve DateTimePicker styling
- **react, react-native**: update versions and add VOD streaming support with new utility functions
- **notification**: add Rsvp type to notification component and types export
- **profile, navigation**: removing local image calss

### Bug Fixes

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

