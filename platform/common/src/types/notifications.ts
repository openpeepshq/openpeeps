import { z } from 'zod';
import { NotificationStats } from './api';
import { roleCapabilities, RoleCapability } from './capabilities';
import { ExpandedNotification } from './internal';

export const actionSchema = z.object({
  action: z.string(),
  title: z.string(),
});
export type Action = z.infer<typeof actionSchema>;
export type ActionType = { actions?: { action: string; title: string }[] };

export const notificationOptionsSchema = z.object({
  body: z.string().optional(),
  icon: z.string().optional(),
  image: z.string().optional(),
  link: z.string().optional(),
  tag: z.string().optional(),
  badge: z.number().optional(),
  data: z.record(z.string(), z.unknown()).optional(),
  actions: actionSchema.array().optional(),
});
export type NotificationOptions = z.infer<typeof notificationOptionsSchema>;

export const pushNotificationSchema = z.object({
  title: z.string().optional(),
  options: notificationOptionsSchema.optional(),
  invalidateQueries: z.array(z.array(z.string())).optional(),
});
export type PushNotification = z.infer<typeof pushNotificationSchema>;

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


