import * as React from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/button';
import { useModalManager } from './manager';

export interface ModalHeaderProps {
  title?: string;
  hasCloseButton?: boolean;
  isCustomTitle?: boolean;
  children?: React.ReactNode;
}

export function ModalHeader({
  title = '',
  hasCloseButton = true,
  isCustomTitle = false,
  children,
}: ModalHeaderProps) {
  const modalManager = useModalManager();

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between border-b border-surface-300 bg-card px-4 py-2 text-2xl font-bold">
      {isCustomTitle ? (
        children
      ) : (
        <div className="flex items-center gap-3">
          <p className="text-lg font-medium">{title}</p>
        </div>
      )}
      {hasCloseButton && (
        <Button
          title="Close"
          action={() => modalManager.close()}
          className="op-btn flex h-12 w-12 items-center justify-center"
        >
          <X />
        </Button>
      )}
    </header>
  );
}
