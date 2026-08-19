import type { ReactNode } from 'react';
import { Button } from '../button';
import type { ButtonAction } from '../../types';
import { DialogFooter } from './dialog';

export type DialogActionsProps = {
  actionLabel: ReactNode;
  onAction: ButtonAction;
  cancelLabel?: ReactNode;
  onCancel?: ButtonAction;
  actionVariant?: 'default' | 'destructive';
  disabled?: boolean;
  className?: string;
};

export const DialogActions = ({
  actionLabel,
  onAction,
  cancelLabel,
  onCancel,
  actionVariant = 'default',
  disabled,
  className,
}: DialogActionsProps) => (
  <DialogFooter className={className}>
    {cancelLabel != null && onCancel != null ? (
      <Button variant="outline" action={onCancel}>
        {cancelLabel}
      </Button>
    ) : null}
    <Button variant={actionVariant} action={onAction} disabled={disabled}>
      {actionLabel}
    </Button>
  </DialogFooter>
);
