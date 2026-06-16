import addNoteTypeToEntries from './migrations/202405240803-add-note-type-to-entries';
import replaceActorWithProfileInFollows from './migrations/202408081110-replace-actor-with-profile-in-follows';
import replaceActorWithProfileInEntries from './migrations/202408271410-replace-actor-with-profile-in-entries';
import replaceActorWithProfileInHasrole from './migrations/202408271410-replace-actor-with-profile-in-hasrole';
import replaceActorWithProfileInMentions from './migrations/202408271410-replace-actor-with-profile-in-mentions';
import replaceActorWithProfileInReactions from './migrations/202408271410-replace-actor-with-profile-in-reactions';
import replaceActorWithProfileInControls from './migrations/202408271410-replace-actor-with-profile-in-controls';
import renameActorCollectionToProfiles from './migrations/202408271413-rename-actor-collection-to-profiles';
import removeLogsCollection from './migrations/202409121232-remove-logs-collection';
import renameUserCollectionToAccount from './migrations/202409201233-rename-user-collection-to-account';
import renameUsertopushsubscriptionToAccounttopushsubscription from './migrations/202409201212-rename-usertopushsubscription-to-accounttopushsubscription';
import replaceUserWithAccountInControls from './migrations/202409181417-replace-user-with-account-in-controls';
import replaceUserWithAccountInAccounttopushsubscription from './migrations/202409191122-replace-user-with-account-in-accounttopushsubscription';
import deleteIndexOnUsername from './migrations/202409201255-delete-index-on-username';
import renameUsernameToHandle from './migrations/202409201353-rename-username-to-handle';
import fixJamEvents from './migrations/202410091215-fix-jam-events';
import fixNotifications from './migrations/202410091254-fix-notifications';
import fixJamEventsAgain from './migrations/202410151159-fix-jam-events-again';
import fixNotificationTypes from './migrations/202502050827-fix-notification-types';
import moveMentionsToAudience from './migrations/202502111625-move-mentions-to-audience';
import setCreatedatUpdatedatEntriesMentions from './migrations/202502122144-set-createdat-updatedat-entries-mentions';
import convertJamsToEvents from './migrations/202504272227-convert-jams-to-events';
import fixMalformedHashtags from './migrations/202510230000-fix-malformed-hashtags';
import normalizeHashtagCase from './migrations/202506160000-normalize-hashtag-case';
import addTypeOnPushSubscriptions from './migrations/202506130804-add-type-on-push-subscriptions';
import addDataToPost from './migrations/202507130841-add-data-to-post';
import setDefaultProfileType from './migrations/202508081551-set-default-profile-type';
import updateMemberships from './migrations/202508111145-update-memberships';
import updateGroupCapabilities from './migrations/202508111237-update-group-capabilities';
import updateJamEvents from './migrations/202508140949-update-jam-events';
import refactorThemeForAllpeepCommunityConfig from './migrations/202510250000-refactor-theme-for-allpeep-community-config';
import addCreatorIdsToPosts from './migrations/202510081854-add-creator-ids-to-posts';
import removeJamMessagesWithoutProfileId from './migrations/202510160916-remove-jam-messages-without-profile-id';
import makeCurrentUsersMembers from './migrations/202510281401-make-current-users-members';
import createProfileSettings from './migrations/202511201612-create-profile-configs';
import deleteInvalidReports from './migrations/202601201200-deleting-invalid-reports'
import deleteDuplicateGroupMemberships from './migrations/202602200230-deleting-duplicate-group-memberships';
import addMemberPostCapabilities from './migrations/202602261200-add-member-post-capabilities';
import removingDeletedAccounts from './migrations/202603180917-permanently-removing-deleted-accounts';
import renameConfigKeysAllpeepToOpenpeeps from './migrations/202603132015-rename-config-keys-allpeep-to-openpeeps';
import migrateLegacyResourceTypes from './migrations/202605221200-migrate-legacy-resource-types';
import fixPrivateGroupMemberPostRead from './migrations/202605221200-fix-private-group-member-post-read';
import deleteDuplicateRoles from './migrations/202605221430-deleting-duplicate-roles';
import renameBackupCapabilitiesToPlural from './migrations/202606051100-rename-backup-capabilities-to-plural';
import addReportsReadToModerator from './migrations/202606051130-add-reports-read-to-moderator';
import fixSearchPostsArrayFields from './migrations/202606060000-fix-search-posts-array-fields';
import fixSearchProfilesArrayFields from './migrations/202606060100-fix-search-profiles-array-fields';

export const dataMigrations = [
  addNoteTypeToEntries,
  replaceActorWithProfileInFollows,
  replaceActorWithProfileInEntries,
  replaceActorWithProfileInHasrole,
  replaceActorWithProfileInMentions,
  replaceActorWithProfileInReactions,
  replaceActorWithProfileInControls,
  renameActorCollectionToProfiles,
  removeLogsCollection,
  renameUserCollectionToAccount,
  renameUsertopushsubscriptionToAccounttopushsubscription,
  replaceUserWithAccountInControls,
  replaceUserWithAccountInAccounttopushsubscription,
  deleteIndexOnUsername,
  renameUsernameToHandle,
  fixJamEvents,
  fixNotifications,
  fixJamEventsAgain,
  fixNotificationTypes,
  moveMentionsToAudience,
  setCreatedatUpdatedatEntriesMentions,
  convertJamsToEvents,
  fixMalformedHashtags,
  normalizeHashtagCase,
  addTypeOnPushSubscriptions,
  addDataToPost,
  setDefaultProfileType,
  updateMemberships,
  updateGroupCapabilities,
  updateJamEvents,
  refactorThemeForAllpeepCommunityConfig,
  addCreatorIdsToPosts,
  removeJamMessagesWithoutProfileId,
  makeCurrentUsersMembers,
  createProfileSettings,
  deleteInvalidReports,
  deleteDuplicateGroupMemberships,
  addMemberPostCapabilities,
  removingDeletedAccounts,
  renameConfigKeysAllpeepToOpenpeeps,
  migrateLegacyResourceTypes,
  fixPrivateGroupMemberPostRead,
  deleteDuplicateRoles,
  renameBackupCapabilitiesToPlural,
  addReportsReadToModerator,
  fixSearchPostsArrayFields,
  fixSearchProfilesArrayFields,
];
