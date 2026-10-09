/**
 * React Native entry: shared hooks/providers only — no web UI components.
 * Metro resolves this via the package `react-native` export condition.
 */
export * from './auth/credentials';
export * from './contexts';
export { vodMasterPlaylistUrl } from './streaming';
export * from './lib/postViewCounter';
export * from './lib/analyticsClicks';
export * from './lib/unseenCountsOptimistic';
export * from './lib/postUnread';
export * from './lib/notificationBadge';
export * from './lib/capabilityMatrix';
export * from './lib/groupFormErrors';
export * from './lib/passwordStrength';
export { apiErrorMessage } from './lib/apiErrorMessage';
export {
  performLogin,
  performRegister,
  performRequestResetPassword,
  performResetPassword,
  performLogout,
} from './lib/auth';
export * from './hooks';
export { useDefaultVisibility } from './components/post/visibility';
export {
  IdentityContext,
  useIdentity,
  useCurrentProfile,
  useCurrentAccount,
  useCurrentProfileSettings,
  useAuthData,
} from './components/layout/IdentityContext';
export type { IdentityContextValue } from './components/layout/IdentityContext';
export { useProfileIdentity } from './components/layout/useProfileIdentity';
export {
  ServerDataProvider,
  useServerData,
  useServerInfo,
  useCapabilities,
} from './components/server-data';
export type { ServerDataProviderProps } from './components/server-data';
export type { ServerDataContextValue } from './components/server-data';
export { I18nProvider } from './i18n/I18nProvider';
export type { I18nProviderProps } from './i18n/I18nProvider';
export { useT, useI18n } from './i18n/context';
export {
  AVAILABLE_UI_LANGUAGES,
  isUiLanguage,
  resolveInitialLanguage,
  resolveProfileLanguage,
} from './i18n';
export type { UiLanguage } from './i18n';
export { buildMainNavItems, isSameNavTarget } from './navigation/menuItems';
export type { MainMenuCapabilities } from './navigation/menuItems';
export type { NavItemDef, NavTarget } from './navigation/targets';
export * from './lib/audienceSetting';
export {
  eventViewStore,
  useEventView,
  EVENT_VIEW_OPTIONS,
} from './stores/eventView';
export type { EventView } from './stores/eventView';
export * from './lib/audienceChoices';
export * from './components/post/attachmentPreview';
export * from './components/profile/profileFieldDisplay';
export {
  firstNWords,
  postReactionStats,
  stringToSegments,
} from './components/post/helpers';
export {
  initializeNewPostStores,
  getNewPostStores,
  useNewPostStores,
  resetStore,
  defaultNewArticle,
  defaultNewResource,
  defaultNewEvent,
  defaultNewNote,
  defaultNewQuestion,
  eventSanitizer,
  getReplyStore,
  resetReplyData,
  useReplyStore,
} from './stores/newPosts';
export type { NewPostsState } from './stores/types';
export {
  extractUrlsFromText,
  isValidUrl,
} from './components/preview-link/helpers';

// Jam logic that only depends on livekit-client (no @livekit/components-react).
export {
  JamProvider,
  useJamContext,
  useJamObserver,
} from './components/jams/JamContext';
export type {
  JamContextValue,
  JamProviderProps,
} from './components/jams/JamContext';
export {
  JamEventsProvider,
  useJamEventsContext,
  useMaybeJamEventsContext,
} from './components/jams/JamEventsContext';
export type { JamEventsContextValue } from './components/jams/JamEventsContext';
export {
  mentionProfilesFromParticipants,
  parseJamEventPayload,
  parseParticipantMetadata,
  sendAttendance,
  sendJamEvent,
  sendReaction,
  toggleHand,
} from './components/jams/jamEventActions';
export type { JamParticipantMetadata } from './components/jams/jamEventActions';
export { useRaisedHands } from './components/jams/useJamHands';
export {
  calculateRecordingState,
  calculateRtmpStreamState,
  useJamRecordingState,
  useJamRtmpStreamState,
} from './components/jams/jamRecordingState';
export { shouldReconnectAfterDisconnect } from './components/jams/disconnectReason';
export {
  JAM_EMOJIS,
  defaultRoomOptions,
  emojis,
} from './components/jams/constants';
export * from './lib/reactionEmojis';
export {
  getJamLocalSettings,
  setJamLocalSettings,
  useJamLocalSettings,
} from './components/jams/jamLocalSettings';
export type { JamLocalSettings } from './components/jams/jamLocalSettings';
export {
  getJamReactionPreferences,
  setJamReactionPreferences,
  useJamReactionPreferences,
} from './components/jams/jamReactionPreferences';
export type { JamReactionPreferences } from './components/jams/jamReactionPreferences';
