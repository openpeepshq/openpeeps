import type { ReactElement } from 'react';
import { Moon, Sun } from 'lucide-react';
import { useGalleryTheme } from '@/providers/GalleryThemeProvider';
import type { GalleryThemeMode } from '@/theme';

const OPTIONS: { mode: GalleryThemeMode; label: string; Icon: typeof Sun }[] = [
  { mode: 'light', label: 'Light', Icon: Sun },
  { mode: 'dark', label: 'Dark', Icon: Moon },
];

export const ThemeSwitcher = (): ReactElement => {
  const { mode, setMode } = useGalleryTheme();

  return (
    <div
      className="border-border bg-card inline-flex rounded-md border p-0.5"
      role="group"
      aria-label="Color theme"
    >
      {OPTIONS.map(({ mode: option, label, Icon }) => {
        const active = mode === option;
        return (
          <button
            key={option}
            type="button"
            aria-pressed={active}
            aria-label={`${label} theme`}
            onClick={() => setMode(option)}
            className={`inline-flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium transition-colors ${
              active
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            <Icon className="size-3.5" aria-hidden />
            {label}
          </button>
        );
      })}
    </div>
  );
};
