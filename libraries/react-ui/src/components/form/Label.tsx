import * as React from 'react';
import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FormMessage } from './types';

export interface LabelProps {
  title?: string;
  messages?: FormMessage[];
  classes?: string;
  description?: string;
  forCheckbox?: boolean;
  inline?: boolean;
  dirty?: boolean;
  required?: boolean;
  htmlFor?: string;
  children?: React.ReactNode;
}

const messageColor = (m: FormMessage, dirty: boolean) => {
  if (!dirty) return '';
  switch (m.severity) {
    case 'error':
      return 'text-error-500';
    case 'warning':
      return 'text-warning-500';
    case 'info':
      return '';
  }
};

/**
 * Translation of `Label.svelte`. Renders title, optional description, child
 * input(s), and form messages.
 */
export function Label({
  title = '',
  messages = [],
  classes,
  description = '',
  forCheckbox = false,
  inline = false,
  dirty = false,
  required = false,
  htmlFor,
  children,
}: LabelProps) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn(
        'flex',
        inline ? 'flex-row items-center gap-2' : 'flex-col',
        classes,
      )}
    >
      {title && (
        <span>
          {title}
          {required && <span className={cn(dirty && 'text-error-500')}>*</span>}
        </span>
      )}
      <span
        className={cn('flex flex-grow', forCheckbox ? 'items-center gap-2' : 'flex-col')}
      >
        {description && <span className="text-sm">{description}</span>}
        {children}
      </span>
      {messages.map((m, idx) => (
        <span key={idx} className={cn('flex items-center gap-2', messageColor(m, dirty))}>
          <Info className="size-4" />
          {m.text}
        </span>
      ))}
    </label>
  );
}
