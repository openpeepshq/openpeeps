import type { ReactElement, ReactNode } from 'react';
import { useState } from 'react';

export type VariantOption<T extends string> = {
  id: T;
  label: string;
};

type Props<T extends string> = {
  label?: string;
  value: T;
  options: VariantOption<T>[];
  onChange: (value: T) => void;
};

/** Dropdown to pick among named variants of a larger showcase. */
export const VariantPicker = <T extends string>({
  label = 'Variant',
  value,
  options,
  onChange,
}: Props<T>): ReactElement => (
  <label className="mb-4 flex max-w-sm items-center gap-3 text-sm">
    <span className="text-muted-foreground shrink-0">{label}</span>
    <select
      className="border-input bg-background h-9 min-w-0 flex-1 rounded-md border px-2"
      value={value}
      onChange={(event) => onChange(event.target.value as T)}
    >
      {options.map((option) => (
        <option key={option.id} value={option.id}>
          {option.label}
        </option>
      ))}
    </select>
  </label>
);

export const useVariant = <T extends string>(
  options: VariantOption<T>[],
): [T, (value: T) => void, VariantOption<T>[]] => {
  const [value, setValue] = useState(options[0]!.id);
  return [value, setValue, options];
};

export const VariantFrame = ({
  picker,
  children,
}: {
  picker: ReactNode;
  children: ReactNode;
}): ReactElement => (
  <div>
    {picker}
    <div className="min-w-0">{children}</div>
  </div>
);
