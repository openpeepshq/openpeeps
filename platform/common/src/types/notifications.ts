import { z } from 'zod';
import { NotificationStats } from './api';
import { roleCapabilities, RoleCapability } from './capabilities';
import { ExpandedNotification } from './internal';

export type ActionType = { actions?: { action: string; title: string }[] };
export type NotificationOptionsType = NotificationOptions & ActionType;

export interface PushNotification {
  title?: string;
  options?: NotificationOptionsType;
  invalidateQueries?: string[][];
}

export interface PushMessage {
  notificationStats: NotificationStats;
  notification: PushNotification;
}

export interface NotificationHandler {
  type: string;
  event: string;
  requiredCapabilities?: RoleCapability[];
  defaultSettings?: { create: boolean; push: boolean; email: boolean };
  eventHandler: (...data: unknown[]) => Promise<void> | void;
  expander?: (
    notification: ExpandedNotification,
  ) => Promise<ExpandedNotification>;
  pushRenderer: (
    notification: ExpandedNotification,
  ) => Promise<PushNotification>;
}

export const notificationTypeSchema = z.object({
  type: z.string(),
  requiredCapabilities: z.enum(roleCapabilities).array().optional(),
  defaultSettings: z.object({
    create: z.boolean(),
    push: z.boolean(),
    email: z.boolean(),
  }).optional(),
});

export type NotificationType = z.infer<typeof notificationTypeSchema>;

export const notificationDefaults = {
  create: true,
  push: true,
  email: false,
} as const;

export const notificationAll = {
  create: true,
  push: true,
  email: true,
} as const;


