import { useEffect, type ReactNode } from 'react';
import { setTheme, themeStyleString } from '@openpeeps/react-ui';
import { getTheme } from '@openpeeps/common';
import { useServerInfo } from '../server-data';
import { useCurrentProfileSettings } from './IdentityContext';

export interface OpenpeepsThemeProviderProps {
  children?: ReactNode;
}

/**
 * Translation of @openpeeps/svelte/components/layout/OpenpeepsThemeProvider.
 * Reads the theme from server config + profile settings, applies the matching
 * data-theme on the body, and injects a `<style>` tag with primary-color
 * overrides into the document head.
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
    const css = themeStyleString(
      base,
      userTheme.primaryHex,
      userTheme.background ?? '',
    );
    const wrapper = document.createElement('div');
    wrapper.innerHTML = css;
    const styleEl = wrapper.firstElementChild as HTMLStyleElement | null;
    if (!styleEl) return;
    styleEl.id = styleId;
    const previous = document.getElementById(styleId);
    previous?.remove();
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
  }, [base, userTheme.primaryHex, userTheme.background, serverInfo]);

  return <>{children}</>;
}
