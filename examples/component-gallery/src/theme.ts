import { applyThemeOverrides, setTheme } from '@openpeepshq/react-ui';

export type GalleryThemeMode = 'light' | 'dark';

/** Per-mode CSS overrides — same fields OpenpeepsThemeProvider injects. */
export type GalleryModeOverrides = {
  primaryHex: string;
  secondaryHex: string;
  fontFamily: string;
  buttonRadius: string;
  radius: string;
  background: string;
};

export type GalleryThemeOverrides = Record<
  GalleryThemeMode,
  GalleryModeOverrides
>;

export const GALLERY_THEME_STORAGE_KEY = 'openpeeps-gallery-theme';
export const GALLERY_THEME_OVERRIDES_KEY = 'openpeeps-gallery-theme-overrides';

const STYLE_ID = '__openpeeps_gallery_theme__';

const HEX = /^#[0-9a-fA-F]{6}$/;

/** Figma token defaults from react-ui globals.css. */
export const DEFAULT_MODE_OVERRIDES: GalleryModeOverrides = {
  primaryHex: '#0c90a7',
  secondaryHex: '#31b28b',
  fontFamily: 'Inter, system-ui, sans-serif',
  buttonRadius: '9999px',
  radius: '8px',
  background: '',
};

export const DEFAULT_THEME_OVERRIDES: GalleryThemeOverrides = {
  light: { ...DEFAULT_MODE_OVERRIDES },
  dark: { ...DEFAULT_MODE_OVERRIDES },
};

export const isHexColor = (value: string): boolean => HEX.test(value);

export const galleryThemeBase = (
  mode: GalleryThemeMode,
): 'OpenpeepsLight' | 'OpenpeepsDark' =>
  mode === 'dark' ? 'OpenpeepsDark' : 'OpenpeepsLight';

export const readStoredGalleryTheme = (): GalleryThemeMode => {
  if (typeof window === 'undefined') return 'light';
  try {
    const stored = window.localStorage.getItem(GALLERY_THEME_STORAGE_KEY);
    if (stored === 'dark' || stored === 'light') return stored;
  } catch {
    // ignore private-mode / blocked storage
  }
  return 'light';
};

const parseModeOverrides = (raw: unknown): GalleryModeOverrides => {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_MODE_OVERRIDES };
  }
  const value = raw as Partial<GalleryModeOverrides>;
  const background =
    typeof value.background === 'string' &&
    !value.background.startsWith('blob:')
      ? value.background
      : '';
  return {
    primaryHex: isHexColor(value.primaryHex ?? '')
      ? value.primaryHex!
      : DEFAULT_MODE_OVERRIDES.primaryHex,
    secondaryHex: isHexColor(value.secondaryHex ?? '')
      ? value.secondaryHex!
      : DEFAULT_MODE_OVERRIDES.secondaryHex,
    fontFamily:
      typeof value.fontFamily === 'string'
        ? value.fontFamily
        : DEFAULT_MODE_OVERRIDES.fontFamily,
    buttonRadius:
      typeof value.buttonRadius === 'string'
        ? value.buttonRadius
        : DEFAULT_MODE_OVERRIDES.buttonRadius,
    radius:
      typeof value.radius === 'string'
        ? value.radius
        : DEFAULT_MODE_OVERRIDES.radius,
    background,
  };
};

export const readStoredGalleryOverrides = (): GalleryThemeOverrides => {
  if (typeof window === 'undefined') return DEFAULT_THEME_OVERRIDES;
  try {
    const stored = window.localStorage.getItem(GALLERY_THEME_OVERRIDES_KEY);
    if (!stored) return DEFAULT_THEME_OVERRIDES;
    const parsed: unknown = JSON.parse(stored);
    if (!parsed || typeof parsed !== 'object') {
      return DEFAULT_THEME_OVERRIDES;
    }
    const value = parsed as Partial<GalleryThemeOverrides>;
    return {
      light: parseModeOverrides(value.light),
      dark: parseModeOverrides(value.dark),
    };
  } catch {
    return DEFAULT_THEME_OVERRIDES;
  }
};

export const persistGalleryTheme = (mode: GalleryThemeMode): void => {
  try {
    window.localStorage.setItem(GALLERY_THEME_STORAGE_KEY, mode);
  } catch {
    // ignore private-mode / blocked storage
  }
};

export const persistGalleryOverrides = (
  overrides: GalleryThemeOverrides,
): void => {
  try {
    const persistable: GalleryThemeOverrides = {
      light: {
        ...overrides.light,
        background: overrides.light.background.startsWith('blob:')
          ? ''
          : overrides.light.background,
      },
      dark: {
        ...overrides.dark,
        background: overrides.dark.background.startsWith('blob:')
          ? ''
          : overrides.dark.background,
      },
    };
    window.localStorage.setItem(
      GALLERY_THEME_OVERRIDES_KEY,
      JSON.stringify(persistable),
    );
  } catch {
    // ignore private-mode / blocked storage
  }
};

export const applyGalleryTheme = (
  mode: GalleryThemeMode,
  overrides: GalleryModeOverrides = DEFAULT_MODE_OVERRIDES,
): void => {
  const base = galleryThemeBase(mode);
  setTheme(base);
  if (typeof document === 'undefined') return;

  document.getElementById(STYLE_ID)?.remove();
  const css = applyThemeOverrides(base, {
    primaryHex: isHexColor(overrides.primaryHex)
      ? overrides.primaryHex
      : DEFAULT_MODE_OVERRIDES.primaryHex,
    secondaryHex: isHexColor(overrides.secondaryHex)
      ? overrides.secondaryHex
      : undefined,
    fontFamily: overrides.fontFamily.trim() || undefined,
    buttonRadius: overrides.buttonRadius.trim() || undefined,
    radius: overrides.radius.trim() || undefined,
    background: overrides.background.trim(),
  });
  const wrapper = document.createElement('div');
  wrapper.innerHTML = css;
  const styleEl = wrapper.firstElementChild as HTMLStyleElement | null;
  if (!styleEl) return;
  styleEl.id = STYLE_ID;
  document.head.appendChild(styleEl);
};
