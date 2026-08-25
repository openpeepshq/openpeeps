import { useEffect, type ReactNode } from 'react';
import {
  applyThemeOverrides,
  readCssColorVar,
  setTheme,
} from '@openpeepshq/react-ui';
import { getTheme } from '@openpeepshq/common';
import { useServerInfo } from '../server-data';
import { useCurrentProfileSettings } from './IdentityContext';

export interface OpenpeepsThemeProviderProps {
  children?: ReactNode;
}

const THEME_GLOBAL_KEY = '__OPENPEEPS_THEME__';

/** Resolved theme tokens exposed to plugin frontends. See docs/PLUGINS.md. */
export interface OpenpeepsPluginTheme {
  primary?: string;
  primaryForeground?: string;
  secondary?: string;
  secondaryForeground?: string;
  surface?: string;
}

declare global {
  interface Window {
    [THEME_GLOBAL_KEY]?: OpenpeepsPluginTheme;
  }
}

/**
 * Reads theme from server config + profile settings, applies `data-theme` on
 * the body, and injects CSS variable overrides (primary/secondary, font,
 * radii, background).
 */
export function OpenpeepsThemeProvider({
  children,
}: OpenpeepsThemeProviderProps) {
  const serverInfo = useServerInfo();
  const profileSettings = useCurrentProfileSettings();
  const userTheme = getTheme(serverInfo.communityConfig, profileSettings);
  const base = userTheme.dark ? 'OpenpeepsDark' : 'OpenpeepsLight';

  useEffect(() => {
    setTheme(base);
    if (typeof document === 'undefined') return;

    const styleId = '__openpeeps_theme__';
    const css = applyThemeOverrides(base, {
      primaryHex: userTheme.primaryHex,
      secondaryHex: userTheme.secondaryHex,
      fontFamily: userTheme.fontFamily,
      buttonRadius: userTheme.buttonRadius,
      radius: userTheme.radius,
      background: userTheme.background ?? '',
    });
    const wrapper = document.createElement('div');
    wrapper.innerHTML = css;
    const styleEl = wrapper.firstElementChild as HTMLStyleElement | null;
    if (!styleEl) return;
    styleEl.id = styleId;
    document.getElementById(styleId)?.remove();
    document.head.appendChild(styleEl);

    // Resolved once the override <style> is in the DOM so plugin frontends
    // (loaded via `window.__OPENPEEPS_PLUGINS__`) can read live theme colors
    // without duplicating the community theme's hex → rgb() conversion.
    window[THEME_GLOBAL_KEY] = {
      primary: readCssColorVar('--color-primary'),
      primaryForeground: readCssColorVar('--color-primary-foreground'),
      secondary: readCssColorVar('--color-secondary'),
      secondaryForeground: readCssColorVar('--color-secondary-foreground'),
      surface: readCssColorVar('--color-surface'),
    };

    const themeColorMeta =
      document.head.querySelector<HTMLMetaElement>(
        'meta[name="theme-color"]',
      ) ??
      (() => {
        const meta = document.createElement('meta');
        meta.name = 'theme-color';
        document.head.appendChild(meta);
        return meta;
      })();
    themeColorMeta.content = userTheme.primaryHex || '#000000';

    return () => {
      styleEl.remove();
    };
  }, [
    base,
    userTheme.primaryHex,
    userTheme.secondaryHex,
    userTheme.fontFamily,
    userTheme.buttonRadius,
    userTheme.radius,
    userTheme.background,
    serverInfo,
  ]);

  return <>{children}</>;
}
