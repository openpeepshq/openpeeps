import type { PublicNotification } from '@openpeepshq/common/types';
import { NotificationErrorBoundary } from './NotificationErrorBoundary';
import { TypedNotification } from './TypedNotification';

export interface NotificationItemProps {
  notification: PublicNotification;
}

export function NotificationItem({ notification }: NotificationItemProps) {
  return (
    <NotificationErrorBoundary notificationId={notification.id}>
      <TypedNotification notification={notification} />
    </NotificationErrorBoundary>
  );
}
