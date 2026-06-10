export { OpenpeepsLight } from './OpenpeepsLight';
export { OpenpeepsDark } from './OpenpeepsDark';
export type { ThemeProperties } from './types';

/**
 * Apply a {@link ThemeProperties} object to the document by writing the
 * `data-theme` attribute and inlining its CSS variables onto `:root`.
 */
export const applyThemeProperties = (theme: {
  name: string;
  properties: Record<string, string>;
}) => {
  if (typeof document === 'undefined') return;
  document.body?.setAttribute('data-theme', theme.name);
  const root = document.documentElement;
  for (const [k, v] of Object.entries(theme.properties)) {
    root.style.setProperty(k, v);
  }
};
