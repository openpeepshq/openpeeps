# Notifications

The AllPeeP notification system handles user notifications through multiple channels: in-app notifications, push notifications, and email notifications. This guide explains how notifications work during development.

## Overview

The notification system is event-driven and supports:

- **In-app notifications** - Stored in ArangoDB, displayed in the UI
- **Push notifications** - Web Push, iOS (APNs), Android (FCM)
- **Email notifications** - HTML email templates

## Architecture

### Notification Flow

```
1. Event Occurs (e.g., postCreated, followCreated)
   ↓
2. Event Handler (registered via registerNotificationHandler)
   ↓
3. maybeCreateNotification() - Checks user preferences
   ↓
4. Notification Created in Database (if enabled)
   ↓
5. hub.emit('notificationCreated', notification)
   ↓
6. Notification Handler (in initializeNotifications)
   ↓
7. Send Email & Push (based on user preferences)
```

### Key Components

**Location**: `platform/core/src/notifications/`

- **`mutations.ts`** - Create, update, read/seen operations
- **`finders.ts`** - Query notifications
- **`helpers.ts`** - Settings, expansion, utilities
- **`handlers.ts`** - Notification handler registry
- **`defaultNotifications/`** - Default notification types
- **`push.ts`** - Push notification sending
- **`firebase.ts`** - Firebase/FCM integration
- **`mapping.ts`** - Database mappings

## Creating Notifications

### Using `maybeCreateNotification`

The primary way to create notifications is through `maybeCreateNotification()`, which respects user preferences:

```typescript
import { maybeCreateNotification } from '@openpeeps/core/notifications';

await maybeCreateNotification(profile, {
  type: 'follow',
  fromProfileId: followerProfile.id,
  // Optional fields:
  postId: '...',
  groupId: '...',
  data: {
    /* custom data */
  },
});
```

**Important**: This function only creates a notification if:

1. The user has notifications enabled for this type
2. The user's profile settings allow it

### Notification Data Structure

```typescript
interface NotificationData {
  type: string; // Notification type (e.g., 'follow', 'reply')
  profileId: string; // Recipient profile ID
  fromProfileId?: string; // Sender profile ID
  postId?: string; // Related post ID
  groupId?: string; // Related group ID
  data?: unknown; // Custom notification data
  read?: boolean; // Read status
  seen?: boolean; // Seen status
  pushHandled?: boolean; // Push sent status
  emailHandled?: boolean; // Email sent status
}
```

## Notification Types

### Default Notification Types

The system includes several default notification types:

- `follow` - Someone followed you
- `reply` - Someone replied to your post
- `reaction` - Someone reacted to your post
- `repost` - Someone reposted your post
- `directMessage` - New direct message
- `jamStarted` - Jam (video call) started
- `jamModerator` - You're a jam moderator
- `jamSpeaker` - You're a jam speaker
- `newProfile` - New profile joined
- `groupAdded` - Added to a group
- `groupMemberJoined` - Member joined your group
- `groupMemberLeft` - Member left your group
- `newGroupPost` - New post in a group
- `pollVote` - Someone voted on your poll
- `rsvp` - RSVP to an event
- `announcement` - System announcement

### Creating Custom Notification Types

1. **Create notification handler**:

```typescript
// platform/core/src/notifications/defaultNotifications/myCustomType/index.ts
import {
  ExpandedNotification,
  NotificationHandler,
  PublicProfile,
  notificationAll,
} from '@openpeeps/common/types';
import { maybeCreateNotification } from '@openpeeps/core/notifications';
import { getProfileAvatar, profileName } from '@openpeeps/common/lib';
import { communityConfig } from '../../../config';

export default {
  type: 'myCustomType',
  event: 'myEventCreated', // Event name from hub
  defaultSettings: notificationAll, // Default: create, push, email
  requiredCapabilities: [], // Required capabilities to receive
  eventHandler: (actor: unknown, target: unknown) =>
    maybeCreateNotification(target as PublicProfile, {
      type: 'myCustomType',
      fromProfileId: (actor as PublicProfile).id,
      data: {
        /* custom data */
      },
    }),
  pushRenderer: async (notification: ExpandedNotification) => ({
    title: `Custom notification title`,
    options: {
      body: `Notification body text`,
      icon: getProfileAvatar(
        notification.senderProfile,
        await communityConfig(),
      ),
      actions: [
        {
          action: `goto:/path`,
          title: 'Action Button',
        },
      ],
    },
  }),
  expander: async (notification) => {
    // Optional: Transform notification data
    return {
      ...notification,
      customField: 'custom value',
    };
  },
} satisfies NotificationHandler;
```

2. **Register the handler**:

```typescript
// In defaultNotifications/index.ts
import { default as myCustomType } from './myCustomType';

const defaultNotificationsHandlers: NotificationHandler[] = [
  // ... existing handlers
  myCustomType,
];
```

3. **Emit the event**:

```typescript
import { hub } from '@openpeeps/core/events';

hub.emit('myEventCreated', actor, target);
```

## User Preferences

### Notification Settings

Users can control notifications per type:

```typescript
interface ProfileNotificationSettings {
  create: boolean; // Create in-app notification
  push: boolean; // Send push notification
  email: boolean; // Send email notification
}
```

Settings are stored in `profileSettings.notifications[type]` and default to the notification type's `defaultSettings`.

### Checking Settings

```typescript
import { notificationSettings } from '@openpeeps/core/notifications/helpers';

const settings = notificationSettings(profileSettings, 'follow');
// Returns: { create: true, push: true, email: true }
```

## Notification Lifecycle

### States

1. **Created** - Notification created in database
2. **Seen** - User has seen the notification (marked when notification list is viewed)
3. **Read** - User has opened/viewed the specific notification
4. **Push Handled** - Push notification sent
5. **Email Handled** - Email notification sent

### Updating Notifications

```typescript
import {
  setNotificationRead,
  setNotificationSeen,
  setAllSeen,
} from '@openpeeps/core/notifications';

// Mark single notification as read
await setNotificationRead(notification);

// Mark single notification as seen
await setNotificationSeen(notification);

// Mark all notifications as seen
await setAllSeen(profile);
```

## Querying Notifications

### List Notifications

```typescript
import { listNotificationsByProfile } from '@openpeeps/core/notifications';

const notifications = await listNotificationsByProfile(profile, {
  start: 'cursor-id', // For pagination
  limit: 100,
});
```

### Find Single Notification

```typescript
import { findNotification } from '@openpeeps/core/notifications';

const notification = await findNotification(profile, notificationId);
```

### Get Stats

```typescript
import { getNotificationStats } from '@openpeeps/core/notifications';

const stats = await getNotificationStats(profile);
// Returns: { unread: number, unseen: number }
```

## Push Notifications

### Supported Platforms

- **Web Push** - Using VAPID keys
- **iOS** - Using Apple Push Notification service (APNs)
- **Android** - Using Firebase Cloud Messaging (FCM)

### Push Notification Format

```typescript
interface PushNotification {
  title: string;
  options: {
    body?: string;
    icon?: string;
    badge?: string;
    image?: string;
    tag?: string;
    data?: Record<string, unknown>;
    actions?: Array<{
      action: string;
      title: string;
      icon?: string;
    }>;
  };
}
```

### Push Renderer

Each notification type defines a `pushRenderer` function that creates the push notification payload:

```typescript
pushRenderer: async (notification: ExpandedNotification) => ({
  title: 'Notification Title',
  options: {
    body: 'Notification body',
    icon: '/path/to/icon.png',
    actions: [
      {
        action: 'goto:/path',
        title: 'View',
      },
    ],
  },
});
```

### Testing Push Notifications

```typescript
import { sendTestPushNotification } from '@openpeeps/core/notifications';

await sendTestPushNotification(account, {
  title: 'Test Notification',
  options: {
    body: 'This is a test',
  },
});
```

## Email Notifications

### Email Templates

Email notifications use React Email templates located in:

- `platform/server/src/emails/notifications/` and `platform/server/src/emails/defaultTemplates/`

### Template Structure

```svelte
<!-- Email.svelte -->
<script lang="ts">
  import type { ExpandedNotification } from '@openpeeps/common/types';

  interface Props {
    notification: ExpandedNotification;
  }

  let { notification }: Props = $props();
</script>

<div>
  <h1>Notification Title</h1>
  <p>{notification.senderProfile?.displayName}...</p>
</div>
```

### Sending Emails

Emails are automatically sent when notifications are created if:

1. User has email notifications enabled for the type
2. User has a valid email address

## Development Workflow

### 1. Testing Notifications Locally

**Create a test notification:**

```typescript
import { maybeCreateNotification } from '@openpeeps/core/notifications';
import { findProfile } from '@openpeeps/core/profiles';

const profile = await findProfile(profileId);
await maybeCreateNotification(profile, {
  type: 'follow',
  fromProfileId: otherProfileId,
});
```

**Check notification in database:**

```typescript
import { listNotificationsByProfile } from '@openpeeps/core/notifications';

const notifications = await listNotificationsByProfile(profile);
console.log(notifications);
```

### 2. Testing Push Notifications

**Enable push subscription:**

1. User subscribes to push in the UI
2. Subscription stored in database
3. Push notifications sent automatically

**Test push manually:**

```typescript
import { sendTestPushNotification } from '@openpeeps/core/notifications';

await sendTestPushNotification(account, {
  title: 'Test',
  options: { body: 'Test notification' },
});
```

### 3. Testing Email Notifications

**Check email service:**

```typescript
import { emailService } from '@openpeeps/core/email';

const mailer = await emailService();
// Emails are sent automatically when notifications are created
```

**View email templates:**

Templates are in `platform/server/src/emails/`

### 4. Debugging Notifications

**Enable logging:**

```typescript
// Notifications are logged automatically
// Check console for notification events
```

**Check notification settings:**

```typescript
import { findProfileSettings } from '@openpeeps/core/profileSettings';

const settings = await findProfileSettings(profileId);
console.log(settings.notifications);
```

**Verify event handlers:**

```typescript
import { notificationHandlers } from '@openpeeps/core/notifications/handlers';

console.log(Array.from(notificationHandlers.keys()));
// Should include all registered notification types
```

## Common Patterns

### Creating Notification on Event

```typescript
// In your domain logic (e.g., posts/mutations.ts)
import { hub } from '../events';
import { maybeCreateNotification } from '../notifications';

export const createPost = async (...) => {
  // ... create post logic

  // Emit event
  hub.emit('postCreated', post);

  // Notification handler will automatically create notifications
  // for users who should be notified
};
```

### Notification Handler Pattern

```typescript
// Handler listens to event and creates notification
export default {
  type: 'reply',
  event: 'postCreated',
  eventHandler: async (post: PostWithMeta) => {
    if (post.inReplyToId) {
      const parentPost = await findPost(post.inReplyToId);
      if (parentPost) {
        await maybeCreateNotification(parentPost.profile, {
          type: 'reply',
          fromProfileId: post.profile.id,
          postId: post.id,
        });
      }
    }
  },
  // ... pushRenderer, expander
};
```

## API Endpoints

### Get Notifications

```
GET /api/openpeeps/core/v1/profiles/current/notifications
```

### Get Notification

```
GET /api/openpeeps/core/v1/profiles/current/notifications/[notificationId]
```

### Mark All Seen

```
PUT /api/openpeeps/core/v1/profiles/current/notifications/mark-all-seen
```

### Get Stats

```
GET /api/openpeeps/core/v1/profiles/current/notifications/stats
```

### Get Notification Types

```
GET /api/openpeeps/core/v1/profiles/current/notifications/types
```

## Best Practices

1. **Always use `maybeCreateNotification`** - Respects user preferences
2. **Use event-driven approach** - Emit events, let handlers create notifications
3. **Provide meaningful push content** - Clear titles and actions
4. **Test all channels** - In-app, push, and email
5. **Handle errors gracefully** - Push/email failures shouldn't break the app
6. **Respect user preferences** - Check settings before creating
7. **Use expander for custom data** - Transform notification data if needed
8. **Keep notifications concise** - Short, actionable messages

## Troubleshooting

### Notifications Not Created

- Check user's notification settings for the type
- Verify event is being emitted
- Check notification handler is registered
- Verify `maybeCreateNotification` is being called

### Push Notifications Not Sent

- Verify push subscription exists
- Check VAPID keys are configured
- Verify user has push enabled for notification type
- Check browser/device supports push notifications

### Email Notifications Not Sent

- Verify email service is configured
- Check user has email notifications enabled
- Verify email template exists
- Check email service logs

## Related Documentation

- [Events System](/docs/development/architecture/backend#event-system) - Event-driven architecture
- [Data Storage](/docs/development/data-storage) - Database patterns
- [Code Style](/docs/development/code-style) - Coding standards
