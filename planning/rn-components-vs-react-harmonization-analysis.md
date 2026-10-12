# Web vs. Native (RN) Parity Analysis

## 1. Architecture Overview

The OpenPeeps platform uses a **two-package architecture** to share logic while
maintaining platform-specific UI rendering:

| Package | Path | Responsibility |
|---|---|---|
| `@openpeepshq/react` | `platform/react/` | Web UI components + shared logic (exported via `react-native.ts` for RN consumption) |
| `@openpeepshq/rn-components` | `platform/rn-components/` | React Native UI components; consumes shared logic from `@openpeepshq/react` |

**Dependency graph:**
```
@openpeepshq/rn-components  ──imports──▶  @openpeepshq/react
   (React Native UI)           from        (web UI + shared logic)
```

The shared logic is surfaced through `@openpeepshq/react`'s `react-native.ts`
entry point (selected via the `"react-native"` export condition in `package.json`).
This exports hooks, stores, types, auth helpers, navigation targets, i18n, server-data
providers, and jam logic — **zero React Native dependencies** in the shared layer.

### What "shared" really means

There are **193 file basenames that appear in both packages** (e.g.
`FeedPost.tsx`, `Article.tsx`, `NotificationItem.tsx`). These are **not
shared source files** — they are **separate, independently-maintained
implementations** in each package. Each pair implements the same conceptual
component with platform-specific rendering (HTML vs React Native), UI libraries,
icon sets, and i18n hooks.

### File counts

| Scope | Web (`@openpeepshq/react`) | RN (`@openpeepshq/rn-components`) |
|---|---|---|
| Total `.ts`/`.tsx` files (components + pages + hooks + stores) | ~334 component/page files | ~316 component/page files |
| Files with matching basename | 193 shared | — |
| Web-only basenames | 141 | — |
| RN-only basenames | 123 | — |

---

## 2. Categories of Deltas

### 2.1 Navigation

| Aspect | Web | RN |
|---|---|---|
| Routing library | `react-router-dom` (BrowserRouter) | `@react-navigation/native` + `native-stack` + `bottom-tabs` |
| Abstraction | `RouterAdapter` interface (BYO-router) | `useNativeRouterAdapter()` bridges React Navigation to `RouterAdapter` |
| Host wiring | `platform/web/src/App.tsx` provides `ReactRouterAdapter` + `webNavigator` | `Navigation` component in `components/navigation/index.tsx` |
| Structure | Desktop sidebar + mobile header/footer | Tab navigator (bottom tabs) + stack navigator |
| Deep links | URL-based via `NavTarget` → `hrefOf()` | Native deep links → `navigationRef.navigate()` |
| Sidebar | `SideBar.tsx` (desktop) + `FooterMobile.tsx` (mobile) | `side-menu.tsx` + `side-menu-drawer.tsx` |

**Key shared abstractions (already harmonized):**
- `NavTarget` type (targets.ts)
- `NavItemDef` type (targets.ts)
- `buildMainNavItems()` (menuItems.ts)
- `isSameNavTarget()` (menuItems.ts)
- `encodeNavRedirect()` / `decodeNavRedirect()` (targets.ts)
- `RouterAdapter` interface + `RouterProvider` + `useRouter()` (contexts/router)

**Gap:** The RN `nativeRouter.tsx` translates `NavTarget` → React Navigation
`navigationRef.navigate()`. The web `webNavigator.ts` translates `NavTarget` →
URL path. Both bridge to the same abstract type. This is well-architected.

### 2.2 Layout & Shell

| Component | Web | RN |
|---|---|---|
| Root layout | `RootLayout` (Root.tsx) with desktop sidebar, mobile header/footer, breadcrumbs, infos | `RootLayout` (RootLayout.tsx) with header, content, plus-button |
| Auth layout | `AuthLayout` (Auth.tsx) with Stripe payment check, `navigate`/`redirectTo`/`hasPayment` props | `AuthLayout` (AuthLayout.tsx) with `KeyboardAwareScrollView`, no payment check |
| Theme provider | `OpenpeesThemeProvider` | `OpenPeepsThemeProvider` |
| Toast provider | `ToastProvider` (`useToast`) | `react-native-toast-message` |
| Breadcrumbs | `Breadcrumbs.tsx` + `Crumb.tsx` | None — replaced by native stack header |
| Page chrome | `pageHeader` store + `useSetPageHeader` | `pageChrome.ts` + `useSetPageChrome` |
| Info banners | `Infos.tsx` (email verification) | Not implemented — no equivalent |
| Access denied | `AccessDenied.tsx` + `AccessDeniedLoader.tsx` | `AccessDenied.tsx` only; no loader |
| SignUp/Login modal | `SignUpLoginModal.tsx` + context | Not applicable (RN has direct auth screens) |

### 2.3 Modal / Screen Patterns

This is the **most impactful divergence** in user-facing behavior.

**Web approach:** React Context state + inline rendering of modal/dialog components:
```
useNewPostModal() → opens <NewPostModal> inline via context
useEditPostModal() → opens <EditPostModal> inline via context
useReplyModal() → opens <ReplyModal> inline via context
openCreateConversation() → opens <CreateNewConversation> dialog via context
```

**RN approach:** React Navigation screen + `navigationRef.navigate()`:
```
useNewPostModal() → navigates to 'NewPost' tab/screen
useEditPostModal() → navigates to 'EditPost' screen
useReplyModal() → navigates to 'ReplyPost' screen
openCreateConversation() → navigates to 'SelectPrivateMessageMembers' / 'DraftMessage'
```

| Modal type (web) | RN equivalent |
|---|---|
| `Dialog` (from @openpeepshq/react-ui) | `BottomSheetModal` (from @gorhom/bottom-sheet) |
| Inline portal rendering | Screen-based navigation |
| `NewPostModal.tsx` | `PostForm.tsx` + `NewPost` screen |
| `EditPostModal.tsx` | `PostForm.tsx` + `EditPost` screen |
| `ReplyModal.tsx` | `PostForm.tsx` + `ReplyPost` screen |
| `CreateNewConversation.tsx` (Dialog) | `NewDraft.tsx` screen + `SelectPrivateMessageMembers` screen |
| `CreateNewJam.tsx` (Dialog) | `NewJam.tsx` screen |

**RN-only post-form screens/sheets not in web:**
- `PostForm.tsx` — reusable form component (web has separate modal components)
- `VisibilitySheet.tsx` — bottom sheet for visibility selection
- `DateSheet.tsx` — bottom sheet for date/time selection
- `ArticlePreviewSheet.tsx` — bottom sheet for article preview
- `PostOptionsSheet.tsx` — bottom sheet for post options (replaces web's PostMenu dropdown)
- `Footer.tsx` — post form footer
- `constants.ts` — post form constants

**Web-only modal components not in RN:**
- `NewPostModal.tsx` — full modal for new post
- `EditPostModal.tsx` — full modal for editing post
- `ReplyModal.tsx` — full modal for replying to post

### 2.4 UI Primitives

The web uses `@openpeepshq/react-ui` (a separate library with Tailwind CSS classes).
The RN has its own `components/ui/` directory with 24 UI components built on:
- `@rn-primitives/*` (unstyled, accessible primitives)
- `nativewind` (Tailwind-to-NativeWind CSS bridge)
- `class-variance-authority` + `clsx` (for variant handling)

| UI Component | Web | RN |
|---|---|---|
| Button | `@openpeepshq/react-ui` `Button` (uses `action` prop, `variant`, `compact`) | Custom `Button` (uses `onPress` prop, `size`, `variant`) |
| Input | `@openpeepshq/react-ui` `Input` | Custom `input.tsx` |
| Select | `@openpeepshq/react-ui` `Select` | Custom `select.tsx` + custom `RadioSelect.tsx` |
| Dropdown menu | `@openpeepshq/react-ui` `PopupMenu`/`PopupMenuButton` | Custom `dropdown-menu.tsx` (wraps @rn-primitives) |
| Dialog/Modal | `@openpeepshq/react-ui` `Dialog` | `bottom-sheet.tsx` + `base-sheet.tsx` |
| Tabs | `@openpeepshq/react-ui` | Custom `tabs.tsx` |
| Calendar | `@openpeepshq/react-ui` | `calendar.tsx` (react-native-calendars) |
| Avatar | `@openpeepshq/react-ui` `Avatar` | Custom `avatar.tsx` (@rn-primitives) |
| Checkbox | `@openpeepshq/react-ui` | Custom `checkbox.tsx` (@rn-primitives) |
| Switch | `@openpeepshq/react-ui` | Custom `switch.tsx` (@rn-primitives) |
| Form | `@openpeepshq/react-ui` | Custom `form.tsx` |
| Toast | `@openpeepshq/react-ui` `useToast` | `react-native-toast-message` |

**Icon divergence:**
- Web: `lucide-react` (SVG icons)
- RN: `lucide-react-native` + custom icon components in `components/icons/` (with `iconWithClassName` helper for NativeWind compatibility)

### 2.5 Markdown Rendering

| Aspect | Web | RN |
|---|---|---|
| Library | `marked` → HTML → `dangerouslySetInnerHTML` | `react-native-markdown-display` (MarkdownIt-based) |
| Preprocessing | `preprocessSource()` (mentions, hashtags → links) | `linkProfileMentions()` + MarkdownIt plugins |
| Link handling | `<a href>` with `resolveStaticUrl()` for SSR | `handleLinkPress()` → `handleInternalURLNavigation()` → `buildGoto()` |
| Static rendering | `useStaticRender()` context + `resolveStaticUrl()` | Not applicable (native has no SSR) |
| Custom extensions | N/A (all HTML-based) | 18 custom plugins: `hashtag`, `mention`, `codeBlock`, `codeInline` |
| Link previews | `PreviewLink` component with SSR support | `PreviewLink` component with native navigation |

**Web-only files:** `classes.ts`, `compileMarkdown.ts`, `staticRender.ts`,
`linkTargets.ts`, `livekit-light-theme.css`, `emojiPickerElement.d.ts`

**RN-only files:** `extensions/` directory (5 files), `theme.ts`, `utils.ts`,
`types/markdown-plugin.ts`

### 2.6 Notifications

**Architecture divergence:**

| Aspect | Web | RN |
|---|---|---|
| Structure | Single `TypedNotification.tsx` with all type rendering inline | 19 separate type files in `notifications/types/` + `notificationComponentMap` dispatch |
| Dispatch | `TypedNotification` switch on `notification.type` | `notificationComponentMap[notification.type]` Record lookup |
| Container props | `group?: Group | null` | `isGroup?: boolean` (boolean flag instead of object) |
| List data | Fetches internally (`openpeepsApi.useCurrentProfileNotifications`) | Takes `query` prop from parent |
| Pagination | IntersectionObserver sentinel | `useFocusEffect` + scroll handling |
| Refresh | No explicit `onRefresh` prop | Explicit `onRefresh` callback prop |
| Error boundary | Shared `NotificationErrorBoundary` | Same component, same approach |

**RN-only notification type files (19):**
`Announcement`, `DirectMessage`, `Follow`, `GroupMemberExit`, `JamModerator`,
`JamSpeaker`, `JamStarted`, `Mention`, `NewGroupInvitation`, `NewGroupMember`,
`NewGroupPost`, `NewProfile`, `PollEnded`, `PollVote`, `Reaction`, `Reply`,
`Repost`, `Rsvp`, `RsvpCanceled`

**Web-only:** `TypedNotification.tsx` (single file containing all type handlers)

### 2.7 Post Form

| Aspect | Web | RN |
|---|---|---|
| Entry point | `NewPostModal.tsx` (Dialog), `EditPostModal.tsx` (Dialog), `ReplyModal.tsx` (Dialog) | `PostForm.tsx` (reusable component) + screen navigation |
| Form layout | All-in-one modal with sections | `Footer.tsx` separates form actions |
| Visibility selector | Inline `VisibilitySelector.tsx` | Separate `VisibilitySheet.tsx` (bottom sheet) |
| Post type switcher | Inline `PostTypeSwitcher.tsx` | Separate `PostTypeSwitcher.tsx` |
| Date/time | Inline form fields | Separate `DateSheet.tsx` (bottom sheet) |
| Article preview | Inline | Separate `ArticlePreviewSheet.tsx` |
| Post options | `PostMenu.tsx` dropdown (PopupMenu) | `PostOptionsSheet.tsx` (bottom sheet) |
| Event cancellation | Inline in EventForm | Separate `CancelEventModal.tsx` |
| Event deletion | N/A (DeletePostModal) | Separate `DeleteEventModal.tsx` |
| Local data | Global stores (`newPosts.ts`, `usePostViewCounter`) | Local store (`useLocalPostStore.ts`) |

**Web-only:** `NewPostModal.tsx`, `EditPostModal.tsx`, `ReplyModal.tsx`
**RN-only:** `PostForm.tsx`, `VisibilitySheet.tsx`, `DateSheet.tsx`,
`ArticlePreviewSheet.tsx`, `PostOptionsSheet.tsx`, `Footer.tsx`, `constants.ts`,
`CancelEventModal.tsx`, `DeleteEventModal.tsx`

### 2.8 Pages

#### Web-only pages (not in RN)

| Page | Reason |
|---|---|
| `Home.tsx` | Web splash/home page with community info |
| `payment/Success.tsx` | Payment success (RN has `auth/Success.tsx` instead) |
| `plugins/Index.tsx` | Plugin management (admin-only) |
| `test/Error.tsx`, `test/Markdown.tsx` | Debug/test pages |
| `auth/Closed.tsx` | Community closed for signups |
| `auth/SsoCallback.tsx`, `auth/OidcCallback.tsx`, `auth/OidcPending.tsx` | SSO/OIDC flows |
| `admin/*` (~50 pages) | Full admin panel: analytics, configuration, diagnostics, moderation, backups, invites, members, groups, reports, plugins |

#### RN-only pages (not in Web)

| Page | Reason |
|---|---|
| `VideoPlayer.tsx` | Standalone video player screen (native) |
| `auth/Welcome.tsx`, `auth/Success.tsx` | Auth flow screens |
| `conversations/NewDraft.tsx` | Draft message screen (navigation-based) |
| `posts/New.tsx`, `posts/Edit.tsx`, `posts/Reply.tsx` | Post creation/editing screens |
| `jams/New.tsx`, `jams/My.tsx` | Jam creation/my-jams screens |
| `profile/Following.tsx` | Following list (web only has Followers) |

#### Settings pages

| Setting | Web | RN |
|---|---|---|
| Account | ✓ both | ✓ both |
| Billing | ✓ web only | ✗ RN |
| Blocked | ✓ both | ✓ both |
| Feed | ✓ both | ✓ both |
| Language | ✓ both | ✓ both |
| Notifications | ✓ both | ✓ both |
| Push devices | ✓ both | ✓ both |
| Theme | ✓ both | ✓ both |
| Timezone | ✓ both | ✓ both |
| Access tokens | ✓ both | ✓ both |

**Web-only settings:** `Billing.tsx` (payment-related)
**RN-only settings:** None (RN settings are subset of web settings)

### 2.9 PWA Infrastructure (Web-only)

The web package has 24 PWA files covering:
- Service worker (`sw.ts`)
- Install prompt (`InstallPrompt.tsx`, `useInstallPrompt.ts`)
- Notification permission (`NotificationPermissionPrompt.tsx`)
- Update prompt (`UpdatePrompt.tsx`)
- Stale app reload (`staleAppReload.ts`)
- Push invalidation (`pushInvalidate.ts`)
- Page reload tracking (`pageReload.ts`)
- Service worker registration (`registration.ts`)
- Vite integration (`vite.ts`)

The RN package handles equivalent functionality through:
- Native push notifications (`@notifee/react-native`, `@react-native-firebase/messaging`)
- Native in-app updates (no SW to update)
- Native notification permissions (`react-native-permissions`)

### 2.10 PWA vs Native Push

| Feature | Web PWA | RN Native |
|---|---|---|
| Library | `push/webPush.ts` (Web Push API) | `push-notifications.ts` (Firebase) |
| VAPID key | `push/vapid.ts` | N/A (Firebase handles auth) |
| Background handler | `pwa/sw.ts` | `lib/push-notifications-background.ts` |
| Subscription | `usePushSubscription.tsx` | `initializePushNotifications()` |
| Badge sync | `useNotificationBadgeSync.ts` | `use-notification-badge-reset.ts` |

### 2.11 Stores

**Web stores (7 files):**
- `breadcrumbs.ts` — breadcrumb trail state
- `createStore.ts` — generic store factory (for Svelte compat)
- `eventView.ts` — calendar/list view toggle
- `feedFormat.ts` — threaded/linear feed format
- `newPosts.ts` — new post form state
- `pageHeader.ts` — page header title/actions
- `plusButton.ts` — floating action button state
- `types.ts` — shared store types (Crumb, PageHeader, PlusButtonAction, NewPostsState)

**RN stores (3 files):**
- `useAppImagesStore.ts` — cached theme images (backgrounds, logos)
- `useLocalPostStore.ts` — draft post data (visibility, content, group)
- `useNewConversationStore.ts` — conversation draft data (members, message)

**Shared stores (exported via `@openpeepshq/react` `react-native.ts`):**
`eventView`, `newPosts`, `feedFormat`, `breadcrumbs`, `pageHeader`, `plusButton`, `types`

**RN-only stores** are for native-specific local persistence and don't exist on web.

### 2.12 i18n

| Aspect | Web | RN |
|---|---|---|
| Provider | `I18nProvider.tsx` (wraps context) | `i18n/index.ts` (initializes i18next singleton) |
| Init | `initI18N(lang, baseUrl)` — creates instance | `initI18nOnce()` — singleton on globalThis |
| Hook | `useT()` (from shared context) | `useTranslation()` (direct from react-i18next) |
| Language resolution | `resolveInitialLanguage()`, `resolveProfileLanguage()` | Uses i18next default |
| Backend | `i18next-http-backend` (fetches from API) | Same backend, same API endpoint |
| Available languages | `['en', 'de']` | Not specified (defaults to i18next config) |

**Key observation:** The RN package initializes i18n as a singleton at module load
time, while the web creates a new instance per `initI18N` call. The shared types
(`UiLanguage`, `AVAILABLE_UI_LANGUAGES`, etc.) are exported from the web package.

### 2.13 Component API Divergences

Even when components share a name, their prop interfaces often differ, making
direct substitution impossible:

| Component | Web props | RN props | Issue |
|---|---|---|---|
| `ConfigMenuButton` | `action: string` (URL path + `Link`) | `onPress: () => void` + no `action` | Action navigation vs. callback |
| `ProfileSelector` | `open, onOpenChange, mode, selectedProfiles, onConfirm` (Dialog pattern) | `forwardRef<BottomSheetModal>` + `selectType, initialProfiles, editMode, single, onDismiss` | Modal vs. sheet, different API shape |
| `NotificationsList` | `{ pageSize?: number }` (fetches internally) | `{ query, isNotificationFeed?, onRefresh? }` (receives query) | Own data vs. prop-driven |
| `NotificationWrapper` | `{ profile, group?: Group\|null, seen?, showProfile?, children? }` | `{ profile, isGroup?: boolean, seen?, showProfile?, children? }` | `group` object vs. `isGroup` boolean |
| `EventRsvpScopeDialog` | `{ open, onClose, post, ... }` (Dialog pattern) | `forwardRef<BottomSheetModal>` + `{ onConfirm, ... }` (Sheet pattern) | Dialog vs. sheet API |
| `Feed` | `{ query, pinnedPostId?, refetchServerInfo?, ... }` | `{ query, pinnedPostId?, inGroup?, formatSwitch?, ... }` | Different optional props |
| `FullPostLayout` | No `hideReply` default → shows replies | `hideReply={false}` default | Minor behavior default diff |
| `PostDetail` | `{ postId: string }` | `{ postId: string, occurrence?: string }` | RN adds occurrence support inline |

### 2.14 Groups Components

The RN adds `GroupNameFromId.tsx` (resolves group handle to name from cache)
which the web doesn't need (web uses URL-based routing). Otherwise both packages
have the same group component set.

### 2.15 Jam Components

| Component | Shared? | Notes |
|---|---|---|
| `JamRoom.tsx` | Both have it (different impl) | Uses @livekit/components-react (web) / @livekit/react-native (RN) |
| `JamLobby.tsx` | Both | Web uses Dialog pattern, RN uses sheet/screen |
| `JamVideoCall.tsx` | Both | Different LiveKit SDK adapters |
| `JamConference.tsx` | Both | Platform-specific conference layout |
| `JamContext.tsx` | Web only | RN has `JamProvider` (in JamContext) + `JamObserverShell` |
| `JamEventsContext.tsx` | Web only | Event broadcasting — RN may use different mechanism |
| `JamDetailsDrawer.tsx` | Both | Web uses drawer, RN uses bottom sheet |

**Web-only jam files:** `JamContext.tsx`, `JamEventsContext.tsx`,
`jamEventActions.ts`, `jamLocalSettings.ts`, `jamReactionPreferences.ts`,
`jamRecordingState.ts`, `livekit-light-theme.css`, `speakerLayout.ts`,
`useJamSpotlight.ts`, `animateEmoji.ts`, `blurProcessor.ts`, `emojiPickerElement.d.ts`

**RN-only jam files:** `DeleteJamModal.tsx`, `JamActionsFooter.tsx`,
`JamCard.tsx`, `JamDrawer.tsx`, `JamRoomPanel.tsx`, `jamRecordingState.ts` (wait,
this is in web only)

Actually, let me correct this. Looking at the file listings:
- `jamRecordingState.ts` is in Web only
- The RN exports `JamRecordingIndicator`, `JamNetworkQuality` from `JamRoomIndicators`

### 2.16 Markdown/Post Input

| Component | Web | RN |
|---|---|---|
| Markdown input | `OpenpeepsMarkdownInput.tsx` (textarea + toolbar) | `OpenpeepsMarkdownInput.tsx` (different input component) |
| Preview links | `ComposePreviewLinks.tsx` | `ComposePreviewLinks.tsx` |
| Attachments | `ComposeAttachments.tsx` | `ComposeAttachments.tsx` |
| Attachment card | `AttachmentCard.tsx` | `AttachmentCard.tsx` |

Both have the same component names but different implementations (e.g., web uses
file input, RN uses media picker sheets).

### 2.17 Custom Media Components (RN-only)

The RN has an extensive `components/custom/` directory with no web equivalent:

```
custom/
  common/    — Loader, audio-player, cached-image, cached-video-player,
               empty-state-container, image-grid, infinite-scroll-container,
               media-upload-progress, participant-avatar, popover, select
  date/      — formatter, timespan, updating-date
  modals/    — base-sheet, sheet-backdrop, sheet-footer,
               media sheets (alt-text, audio-picker, document-picker,
               image-picker, record-audio, send-media, video-picker),
               settings sheets (edit-notifications)
  navigation/ — side-menu
```

The web handles these concerns through browser APIs (HTML file inputs, native
date selectors, CSS animations) and `@openpeepshq/react-ui` components.

### 2.18 Profile Components

| Component | Web | RN | Notes |
|---|---|---|---|
| `Avatar` | Uses `@openpeepshq/react-ui` `Avatar` | Custom `Avatar` (@rn-primitives) + `ProfileAvatar` | Different base component |
| `ProfileSelector` | Dialog-based with different props | BottomSheetModal-based with different props | See API divergences |
| `ProfileSheet` | N/A | RN-only (bottom sheet for profile actions) | — |
| `EditProfileForm` | N/A | RN-only | Web may use inline form in settings |
| `ProfileFromId` | Both | Both | Same name, different impl |

### 2.19 Conversations

| Component | Web | RN | Notes |
|---|---|---|--- |
| `CreateNewConversation` | Dialog (inline) | Not present (uses navigation) | Web has the modal component, RN navigates to screen |
| `CreateNewConversationContext` | State-based, renders dialog | Navigation-based, uses `navigationRef` | Fundamental pattern difference |
| `ConversationParticipantsModal` | Dialog-based | BottomSheetModal-based | Modal vs. sheet |
| `ConversationPreviewCard` | Not present | RN-only | Web uses different layout |

### 2.20 Form Components

| Component | Web | RN | Notes |
|---|---|---|---|
| `ImageInput` | Both (Dialog for image editing) | Both (media picker sheets) | Different file picker approach |
| `LocationInput` | Web only | N/A | RN uses native location picker |
| `ImageEditModal` | Web only | N/A | RN uses sheets |
| `TimeZoneSelect` | Both | Both | Different UI primitives |
| `RadioSelect` | N/A | RN-only | Web uses react-ui Select |
| `HeaderAvatarInput` | Both | Both | Different impl |

---

## 3. Shared Logic Already Harmonized

The following categories are **already well-harmonized** through
`@openpeepshq/react`'s `react-native.ts` export:

| Category | Shared exports | Both platforms use the same code |
|---|---|---|
| Auth forms | `usePasswordLogin`, `useRegisterAccount`, `useRequestPasswordReset`, `useResetPassword` | ✓ |
| Post presentation | `useFeedPostPresentation`, `usePostThreads`, `usePostDetailTitle` | ✓ |
| Post view tracking | `usePostViewRef`, `usePostViewCounter`, `postViewCounter.ts` | ✓ |
| Post unread logic | `postUnread.ts` | ✓ |
| Feed format | `useResolvedFeedFormat`, `useFeedFormatPreference`, `feedFormat.ts` | ✓ |
| Event view | `useEventView`, `eventView.ts` | ✓ |
| New posts stores | `initializeNewPostStores`, `useNewPostStores`, `eventSanitizer`, etc. | ✓ |
| Unread counts | `adjustUnseenCounts`, `invalidateUnseenCounts`, `unseenCountsOptimistic.ts` | ✓ |
| Analytics clicks | `analyticsClicks.ts` | ✓ |
| Notification badge | `notificationBadge.ts` | ✓ |
| Navigation | `NavTarget`, `NavItemDef`, `buildMainNavItems`, `isSameNavTarget`, `RouterAdapter`, `RouterProvider`, `useRouter` | ✓ |
| i18n | `UiLanguage`, `AVAILABLE_UI_LANGUAGES`, `isUiLanguage`, `resolveInitialLanguage`, `resolveProfileLanguage`, `I18nProvider`, `useT`, `useI18n` | ✓ |
| Server data | `ServerDataProvider`, `useServerData`, `useServerInfo`, `useCapabilities` | ✓ |
| Identity | `IdentityContext`, `useIdentity`, `useCurrentProfile`, `useAuthData`, `useCurrentProfileSettings` | ✓ |
| Profile identity | `useProfileIdentity` | ✓ |
| Jam logic | `JamProvider`, `useJamContext`, `JamEventsProvider`, `jamEventActions`, `JAM_EMOJIS`, `defaultRoomOptions`, `emojis` | ✓ |
| Jam settings | `getJamLocalSettings`, `setJamLocalSettings`, `useJamLocalSettings` | ✓ |
| Jam reactions | `getJamReactionPreferences`, `setJamReactionPreferences`, `useJamReactionPreferences` | ✓ |
| Capabilities | `capabilityMatrix.ts` | ✓ |
| Password | `passwordStrength.ts` | ✓ |
| Group form | `groupFormErrors.ts` | ✓ |
| Audience | `audienceSetting.ts`, `audienceChoices.ts` | ✓ |
| Credentials | `credentialsStore` | ✓ |
| Configuration | `resolveAdminConfigSchema`, `diffConfigTrees`, `equal` | ✓ |
| Common helpers | `firstNWords`, `postReactionStats`, `stringToSegments`, `extractUrlsFromText`, `isValidUrl` | ✓ |
| Post types | `attachmentPreview`, `profileFieldDisplay` | ✓ |

**Note:** The web's `react-native.ts` exports these from web package paths. When
the RN package imports `@openpeepshq/react`, it resolves to the web package and
gets the same shared logic. The web package itself uses these same exports
internally via `@openpeepshq/react` self-imports.

---

## 4. Action Plan

### Phase 1: Stabilize & Document (Week 1-2)

1. **Fix broken imports in `conversations/CreateNewConversationContext.tsx`** (web)
   - The web version was confirmed correct after grep verification — it renders
     `<CreateNewConversation>` inline. No fix needed.

2. **Document the shared contract surface**
   - Create a `CONTRACT.md` listing which hooks/stores/types are the stable
     cross-platform API and which components must be re-implemented per platform.

3. **Audit component API divergences** (from §2.13)
   - Create a type-compatibility matrix for the 8 divergent component APIs.

### Phase 2: Harmonize High-Impact Components (Week 3-4)

Priority order based on user impact and rework cost:

| Priority | Component | Effort | Benefit |
|---|---|---|---|
| P0 | `NotificationsList` API | Low | Fixes data-fetching mismatch; RN takes `query` prop, web fetches internally. Unify to prop-driven `pageSize` API. |
| P0 | `NotificationWrapper` API | Low | `group?: Group\|null` vs `isGroup?: boolean` — harmonize to `isGroup` boolean (simpler). |
| P0 | `ConfigMenuButton` API | Low | Harmonize `action` (web) vs `onPress` (RN) to accept both. |
| P1 | `ProfileSelector` API | Med | Web Dialog API vs RN BottomSheetModal API — different prop shapes. Add adapter. |
| P1 | `EventRsvpScopeDialog` API | Med | Web Dialog `open/onClose` vs RN Sheet `forwardRef`. Add `open` compat wrapper. |
| P2 | `Feed` props | Low | Align optional props (`refetchServerInfo` vs none). |
| P2 | `FullPostLayout` | Low | `hideReply` default difference. |
| P2 | `PostDetail` | Low | Add `occurrence` prop to web version. |

### Phase 3: Component Consolidation (Week 4-6)

3. **Notification type rendering**
   - **Option A (split):** Refactor web's `TypedNotification.tsx` into 19 separate
     type files matching RN's structure, then extract shared type logic.
   - **Option B (merge):** Refactor RN's 19 files into a single `TypedNotification.tsx`.
   - **Recommended:** Option A — splitting improves tree-shaking and matchability.

4. **Post-form architecture convergence**
   - **Web:** Currently has `NewPostModal.tsx` (Dialog), `EditPostModal.tsx` (Dialog),
     `ReplyModal.tsx` (Dialog) — each with near-identical form fields.
   - **RN:** Has `PostForm.tsx` (reusable component) + screen navigation.
   - **Recommended:** Adopt the RN's `PostForm.tsx` as the shared form component.
     Web wraps it in a `Dialog`, RN wraps it in a screen. This reduces 3 duplicated
     form implementations to 1 + 2 thin wrappers.

5. **Markdown shared logic**
   - The `preprocessSource()` (web) and `linkProfileMentions()` (RN) logic overlap.
   - Extract shared markdown preprocessing into `@openpeepshq/react` lib layer.

### Phase 4: Missing Pages Gap (Week 5-6)

**RN needs to add:**
- `pages/conversations/New.tsx` (web has `New.tsx`, RN has `NewDraft.tsx`)
- `pages/jams/My.tsx` and `pages/jams/New.tsx` (RN has these, web doesn't)
- `pages/profile/Following.tsx` (RN has, web doesn't)
- `pages/posts/Edit.tsx`, `posts/New.tsx`, `posts/Reply.tsx` (RN has, web doesn't)

**Web-only pages to consider for RN porting:**
- `pages/conversations/New.tsx` — may need harmonization with RN's `NewDraft.tsx`
- Admin pages — **not needed on RN** (admin is web-only)
- `pages/Home.tsx` — RN has `Welcome.tsx` as entry instead
- SSO/OIDC auth pages — RN uses different auth flow (native browser)
- `pages/plugins/Index.tsx` — admin/plugin management (web-only)

### Phase 5: PWA / Native Feature Parity (Ongoing)

| Feature | Web (PWA) | RN (Native) | Harmonization needed? |
|---|---|---|---|
| Push notifications | Web Push API (`push/webPush.ts`) | Firebase (`push-notifications.ts`) | No — different transport layers |
| App badge | `useNotificationBadgeSync.ts` (PWA) | `@notifee/react-native` | Partial — badge clearing logic could be shared |
| Install prompt | `InstallPrompt.tsx` | N/A (native app) | No |
| Service worker | `sw.ts` | N/A | No |
| In-app updates | `UpdatePrompt.tsx` (SW) | Native app store updates | No |
| Notification permission | `NotificationPermissionPrompt.tsx` (browser) | `react-native-permissions` | No — platform-specific |

### Phase 6: Navigation Deep Link Parity (Week 3)

The `nativeRouter.tsx` `navigateToTarget()` function handles 20+ NavTarget types.
Audit for missing targets:
- `docs` → not handled in RN (no docs screens on native)
- `external` → not handled (use `Linking.openURL` instead)
- `path` → not handled (RN should map to specific screen)
- `paymentSuccess` → not handled on RN (payment is web-only)

### Phase 7: Testing & Verification (Ongoing)

- Add visual regression tests for shared component pairs
- Add type-level compatibility tests for divergent APIs
- Verify all 193 shared-basename components render equivalent content
- Run lint/typecheck on both packages after each change

---

## 5. Recommended Prioritization

### Immediate (do first)
1. Fix `NotificationsList` API mismatch — low effort, high impact
2. Fix `NotificationWrapper` prop mismatch — low effort
3. Fix `ConfigMenuButton` prop mismatch — low effort
4. Audit `navigateToTarget` for unhandled NavTargets — medium effort

### Short-term (next sprint)
5. Split web's `TypedNotification.tsx` into separate type files
6. Consolidate post-form into shared `PostForm.tsx` + platform wrappers
7. Harmonize `ProfileSelector` and `EventRsvpScopeDialog` APIs

### Medium-term (next 2-3 sprints)
8. Add missing RN pages (profile/Following, jams/My, posts/Edit, etc.)
9. Extract shared markdown preprocessing logic
10. Align `Feed` and `FeedPost` props across platforms
11. Consider extracting common component logic into `@openpeepshq/react` (e.g.,
    notification type rendering functions without UI, markdown preprocessing)

### Long-term / Won't do
- Admin pages on RN — not a use case
- PWA features on RN — different platform primitives
- Full UI component unification — the modal-vs-screen and HTML-vs-RN-Native
  divergence is fundamental and intentional; convergence would mean choosing one
  platform's approach and losing the other's UX.
