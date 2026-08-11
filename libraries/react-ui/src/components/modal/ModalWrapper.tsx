import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ModalWrapperProps {
  className?: string;
  width?: string;
  children?: React.ReactNode;
}

export function ModalWrapper({
  className,
  width = 'w-[95vw] max-w-2xl',
  children,
}: ModalWrapperProps) {
  return (
    <div
      className={cn(
        'op-card max-h-[90vh] overflow-y-auto bg-surface shadow-xl',
        width,
        className,
      )}
    >
      {children}
    </div>
  );
}
