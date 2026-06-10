import * as React from 'react';
import { uuidv4 } from 'uuidv7';
import { cn } from '@/lib/utils';
import { Label } from './Label';

export interface RadioSelectOption {
  title: string;
  description: string;
  value: string;
}

export interface RadioSelectProps {
  title?: string;
  description?: string;
  disabled?: boolean;
  value?: string;
  onChange?: (value: string) => void;
  options: RadioSelectOption[];
  optionTestId?: (value: string) => string;
}

export function RadioSelect({
  title = '',
  description,
  disabled = false,
  value,
  onChange,
  options,
  optionTestId,
}: RadioSelectProps) {
  const idPrefix = React.useMemo(() => `radio-select-${uuidv4()}-`, []);

  return (
    <div className={cn('flex flex-col gap-y-2 px-4', disabled && 'opacity-50')}>
      <Label classes="text-lg font-medium" title={title} />
      {description && <div>{description}</div>}
      {options.map((option) => {
        const id = `${idPrefix}-${option.value}`;
        return (
          <div className="flex gap-x-2" key={option.value}>
            <input
              type="radio"
              id={id}
              checked={value === option.value}
              onChange={(e) => onChange?.(e.currentTarget.value)}
              className="mt-1 size-4 text-primary-500"
              value={option.value}
              disabled={disabled}
              data-testid={optionTestId?.(option.value)}
            />
            <div>
              <label className="font-medium text-surface-700" htmlFor={id}>
                {option.title}
              </label>
              <label className="text-surface-700" htmlFor={id}>
                {option.description}
              </label>
            </div>
          </div>
        );
      })}
    </div>
  );
}
