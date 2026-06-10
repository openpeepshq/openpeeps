import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ModalFooterProps {
  className?: string;
  children?: React.ReactNode;
}

export function ModalFooter({ className, children }: ModalFooterProps) {
  return (
    <footer
      className={cn(
        'sticky bottom-0 flex items-center justify-between border-t border-surface-300 bg-card px-4 py-2',
        className,
      )}
    >
      {children}
    </footer>
  );
}
