import * as React from 'react';
import { cn, deepGet, deepSet } from '@/lib/utils';
import { Label } from './Label';
import { useFormContext } from './context';

export interface FormRadioBoolProps {
  name: string;
  title?: string;
  description?: string;
  descriptionTrue?: string;
  titleTrue?: string;
  descriptionFalse?: string;
  titleFalse?: string;
  path: string[];
  disabled?: boolean;
}

export function FormRadioBool({
  name,
  title = '',
  description,
  descriptionTrue = '',
  titleTrue = '',
  descriptionFalse = '',
  titleFalse = '',
  path,
  disabled = false,
}: FormRadioBoolProps) {
  const { data, validate } = useFormContext();
  const currentValue = deepGet(data, path) === true;

  const update = (e: React.ChangeEvent<HTMLInputElement>) => {
    deepSet(data as object, path, e.currentTarget.value === 'true');
    void validate();
  };

  return (
    <div className={cn('flex flex-col gap-y-2 px-4', disabled && 'opacity-50')}>
      <Label classes="text-lg font-medium" title={title} />
      {description && <div>{description}</div>}
      <div className="flex gap-x-2">
        <input
          type="radio"
          name={name}
          id={`${name}-false`}
          checked={!currentValue}
          onChange={update}
          className="mt-1 size-4 text-primary"
          value="false"
          disabled={disabled}
        />
        <div>
          <label className="font-medium text-foreground" htmlFor={`${name}-false`}>
            {titleFalse}
          </label>
          <label className="text-foreground" htmlFor={`${name}-false`}>
            {descriptionFalse}
          </label>
        </div>
      </div>
      <div className="flex gap-x-2">
        <input
          type="radio"
          name={name}
          id={`${name}-true`}
          checked={currentValue}
          onChange={update}
          className="mt-1 size-4 text-primary"
          value="true"
          disabled={disabled}
        />
        <div>
          <label className="font-medium text-foreground" htmlFor={`${name}-true`}>
            {titleTrue}
          </label>
          <label className="text-foreground" htmlFor={`${name}-true`}>
            {descriptionTrue}
          </label>
        </div>
      </div>
    </div>
  );
}
