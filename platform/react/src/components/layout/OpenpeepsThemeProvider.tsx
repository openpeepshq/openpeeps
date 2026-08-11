import { useEffect, type ReactNode } from 'react';
import { applyThemeOverrides, setTheme } from '@openpeepshq/react-ui';
import { getTheme } from '@openpeepshq/common';
import { useServerInfo } from '../server-data';
import { useCurrentProfileSettings } from './IdentityContext';

export interface OpenpeepsThemeProviderProps {
  children?: ReactNode;
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
    themeColorMeta.content =
      serverInfo.communityConfig?.theme?.primaryHex || '#000000';

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
