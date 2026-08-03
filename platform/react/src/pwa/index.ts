export {
  registerServiceWorker,
  type RegisterServiceWorkerOptions,
  type ServiceWorkerHandle,
} from './registration';
export {
  useServiceWorker,
  type UseServiceWorkerOptions,
  type UseServiceWorkerResult,
} from './useServiceWorker';
export {
  useInstallPrompt,
  type UseInstallPromptResult,
} from './useInstallPrompt';
export { PwaProvider, type PwaProviderProps } from './PwaProvider';
export { InstallPrompt, type InstallPromptProps } from './InstallPrompt';
export { UpdatePrompt, type UpdatePromptProps } from './UpdatePrompt';
export {
  NotificationPermissionPrompt,
  type NotificationPermissionPromptProps,
} from './NotificationPermissionPrompt';
export type { SWMessageFromPage, SWMessageToPage } from './sw-types';

/**
 * Build a vite-plugin-pwa config that uses our shipped service-worker.ts.
 *
 * Prefer `@openpeeps/react/pwa-vite` in Vite configs so the import stays a
 * single subpath and does not pull in React PWA UI modules.
 *
 *   import { openpeepsPwaPluginConfig } from '@openpeeps/react/pwa-vite';
 */
export { openpeepsPwaPluginConfig } from './vite';
export type { OpenpeepsPwaPluginOptions } from './vite';
