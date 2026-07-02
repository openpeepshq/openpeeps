/** React Query key prefixes invalidated by web push notifications. */
export const PUSH_INVALIDATE = {
  notificationStats: ['profiles', 'current', 'notifications', 'stats'],
  notifications: ['profiles', 'current', 'notifications'],
  conversations: ['conversations'],
  posts: ['posts'],
  unseenCounts: ['posts', 'unseen', 'counts'],
  groups: ['groups'],
  profiles: ['profiles'],
};
