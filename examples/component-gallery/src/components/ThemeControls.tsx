import type { ChangeEvent, ReactElement, ReactNode } from 'react';
import { Button } from '@openpeepshq/react-ui';
import { useGalleryTheme } from '@/providers/GalleryThemeProvider';
import { isHexColor } from '@/theme';

const fieldClass =
  'border-input bg-background h-8 w-full rounded-md border px-2 text-xs';

const Field = ({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}): ReactElement => (
  <label className="block space-y-1">
    <span className="text-muted-foreground text-xs">{label}</span>
    {children}
  </label>
);

const ColorField = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}): ReactElement => (
  <Field label={label}>
    <div className="flex items-center gap-2">
      <input
        type="color"
        aria-label={label}
        className="size-8 cursor-pointer rounded-full border-0 bg-transparent p-0"
        value={isHexColor(value) ? value : '#000000'}
        onChange={(event) => onChange(event.target.value)}
      />
      <input
        className={`${fieldClass} font-mono`}
        value={value}
        spellCheck={false}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  </Field>
);

export const ThemeControls = (): ReactElement => {
  const { mode, current, patchCurrent, resetCurrent } = useGalleryTheme();

  const onBackgroundFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    patchCurrent({ background: URL.createObjectURL(file) });
  };

  return (
    <div className="border-border space-y-3 border-t pt-4">
      <div>
        <p className="text-sm font-medium">Theme properties</p>
        <p className="text-muted-foreground mt-0.5 text-xs">
          Editing {mode} — same CSS overrides the app injects.
        </p>
      </div>
      <ColorField
        label="Primary"
        value={current.primaryHex}
        onChange={(primaryHex) => patchCurrent({ primaryHex })}
      />
      <ColorField
        label="Secondary"
        value={current.secondaryHex}
        onChange={(secondaryHex) => patchCurrent({ secondaryHex })}
      />
      <Field label="Font family">
        <input
          className={fieldClass}
          value={current.fontFamily}
          placeholder="Inter, system-ui, sans-serif"
          onChange={(event) => patchCurrent({ fontFamily: event.target.value })}
        />
      </Field>
      <Field label="Button radius">
        <input
          className={fieldClass}
          value={current.buttonRadius}
          placeholder="9999px"
          onChange={(event) =>
            patchCurrent({ buttonRadius: event.target.value })
          }
        />
      </Field>
      <Field label="Card / modal radius">
        <input
          className={fieldClass}
          value={current.radius}
          placeholder="8px"
          onChange={(event) => patchCurrent({ radius: event.target.value })}
        />
      </Field>
      <Field label="Background image">
        <input
          className={fieldClass}
          value={
            current.background.startsWith('blob:') ? '' : current.background
          }
          placeholder="https://… or choose a file"
          onChange={(event) => patchCurrent({ background: event.target.value })}
        />
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <label className="border-input hover:bg-muted cursor-pointer rounded-md border px-2 py-1 text-xs">
            Choose file
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={onBackgroundFile}
            />
          </label>
          {current.background ? (
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground text-xs"
              onClick={() => patchCurrent({ background: '' })}
            >
              Clear
            </button>
          ) : null}
        </div>
        {current.background ? (
          <div
            className="border-border mt-2 h-16 rounded-md border bg-cover bg-center"
            style={{ backgroundImage: `url(${current.background})` }}
          />
        ) : null}
      </Field>
      <Button
        variant="outline"
        size="sm"
        action={resetCurrent}
        className="w-full"
      >
        Reset {mode}
      </Button>
    </div>
  );
};
