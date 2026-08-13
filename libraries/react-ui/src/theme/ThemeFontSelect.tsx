import type { ReactElement } from 'react';
import { matchThemeFont, THEME_FONTS } from './fonts';

export type ThemeFontSelectProps = {
  value?: string;
  onChange: (family: string) => void;
  className?: string;
  id?: string;
  'aria-label'?: string;
};

export const ThemeFontSelect = ({
  value,
  onChange,
  className,
  id,
  'aria-label': ariaLabel,
}: ThemeFontSelectProps): ReactElement => {
  const selected = matchThemeFont(value);

  return (
    <select
      id={id}
      aria-label={ariaLabel}
      className={className}
      value={selected.id}
      style={{ fontFamily: selected.cssFamily }}
      onChange={(event) => onChange(event.target.value)}
    >
      {THEME_FONTS.map((font) => (
        <option
          key={font.id}
          value={font.id}
          style={{ fontFamily: font.cssFamily }}
        >
          {font.family}
        </option>
      ))}
    </select>
  );
};
