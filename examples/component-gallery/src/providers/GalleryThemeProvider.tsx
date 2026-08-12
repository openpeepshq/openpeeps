import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import type { ProfileSettings } from '@openpeepshq/common/types';
import {
  applyGalleryTheme,
  persistGalleryOverrides,
  persistGalleryTheme,
  readStoredGalleryOverrides,
  readStoredGalleryTheme,
  DEFAULT_MODE_OVERRIDES,
  type GalleryModeOverrides,
  type GalleryThemeMode,
  type GalleryThemeOverrides,
} from '@/theme';

type GalleryThemeContextValue = {
  mode: GalleryThemeMode;
  setMode: (mode: GalleryThemeMode) => void;
  overrides: GalleryThemeOverrides;
  current: GalleryModeOverrides;
  patchCurrent: (patch: Partial<GalleryModeOverrides>) => void;
  resetCurrent: () => void;
};

const GalleryThemeContext = createContext<GalleryThemeContextValue | null>(
  null,
);

export const useGalleryTheme = (): GalleryThemeContextValue => {
  const ctx = useContext(GalleryThemeContext);
  if (!ctx) {
    throw new Error('useGalleryTheme must be used within GalleryThemeProvider');
  }
  return ctx;
};

export const galleryProfileSettings = (
  mode: GalleryThemeMode,
): ProfileSettings =>
  ({
    id: 'gallery-profile-settings',
    theme: mode,
  }) as ProfileSettings;

type Props = {
  children: ReactNode;
};

export const GalleryThemeProvider = ({ children }: Props): ReactElement => {
  const [mode, setModeState] = useState<GalleryThemeMode>(() =>
    readStoredGalleryTheme(),
  );
  const [overrides, setOverrides] = useState<GalleryThemeOverrides>(() =>
    readStoredGalleryOverrides(),
  );

  useEffect(() => {
    applyGalleryTheme(mode, overrides[mode]);
    persistGalleryTheme(mode);
    persistGalleryOverrides(overrides);
  }, [mode, overrides]);

  const setMode = (next: GalleryThemeMode) => {
    setModeState(next);
  };

  const patchCurrent = (patch: Partial<GalleryModeOverrides>) => {
    setOverrides((prev) => {
      const current = prev[mode];
      const nextBackground = patch.background ?? current.background;
      if (
        patch.background !== undefined &&
        current.background.startsWith('blob:') &&
        current.background !== nextBackground
      ) {
        URL.revokeObjectURL(current.background);
      }
      return {
        ...prev,
        [mode]: { ...current, ...patch },
      };
    });
  };

  const resetCurrent = () => {
    setOverrides((prev) => {
      const current = prev[mode];
      if (current.background.startsWith('blob:')) {
        URL.revokeObjectURL(current.background);
      }
      return { ...prev, [mode]: { ...DEFAULT_MODE_OVERRIDES } };
    });
  };

  return (
    <GalleryThemeContext.Provider
      value={{
        mode,
        setMode,
        overrides,
        current: overrides[mode],
        patchCurrent,
        resetCurrent,
      }}
    >
      {children}
    </GalleryThemeContext.Provider>
  );
};
