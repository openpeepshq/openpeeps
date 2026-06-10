import type { PublicNotification } from '@openpeeps/common/types';
import { TypedNotification } from './TypedNotification';

export interface NotificationItemProps {
  notification: PublicNotification;
}

export function NotificationItem({ notification }: NotificationItemProps) {
  return <TypedNotification notification={notification} />;
}
