/**
 * Community UI extracted from the Black Ambition app: screens, shared components, and wiring.
 *
 * Host apps must configure NativeWind, wrap Metro with `withOpenPeepsMetro`
 * from `@openpeepshq/rn-components/metro`, `react-native-config`, i18n, and
 * the same peer native modules.
 */

import './lib/polyfills/customEvent';

export * from './screens';

export * from './components/custom';
export * from './components/ui';
export * from './components/navigation/types';
export * from './components/icons';

export * from './stores/useAppImagesStore';
export * from './stores/useJamStore';
export * from './stores/useLocalPostStore';
export * from './stores/useNewConversationStore';

export { DrawerProvider, useDrawer } from './contexts/drawer-context';
export { OpenpeepsProvider } from './contexts/openpeeps-provider';

export { Navigation } from './components/navigation';
export { Base } from './components/navigation/Base';

export { OpenPeepsThemeProvider, useOpenPeepsTheme } from './theme/OpenPeepsThemeProvider';
export type { OpenPeepsTheme, ColorName, ColorValue } from './theme/types';

export { default as i18next, initI18nOnce } from './i18n';

export * from './lib/constants';

export { credentialsStore } from './lib/credentialsStore';
export { useStableLiveKitRoom } from './lib/livekit/useStableLiveKitRoom';
