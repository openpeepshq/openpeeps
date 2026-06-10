import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogPortal,
  DialogOverlay,
} from '@/components/ui/dialog';
import { modalStore, type ModalEntry } from './store';

/**
 * Renders the top of the modal stack. Mount this once in your app shell
 * (replaces `<Modal />` from Skeleton).
 */
export function Modal() {
  const stack = React.useSyncExternalStore(
    modalStore.subscribe,
    modalStore.getStack,
    modalStore.getStack,
  );
  const top = stack[0] as ModalEntry | undefined;

  return (
    <Dialog
      open={!!top}
      onOpenChange={(open) => {
        if (!open) modalStore.closeTop();
      }}
    >
      {top && (
        <DialogPortal>
          <DialogOverlay />
          <DialogContent showCloseButton={false} className="max-h-[90vh] overflow-y-auto p-0">
            <ModalEntryRenderer entry={top} />
          </DialogContent>
        </DialogPortal>
      )}
    </Dialog>
  );
}

function ModalEntryRenderer({ entry }: { entry: ModalEntry }) {
  const Component = entry.component;
  const setResponse = React.useCallback(
    (value: unknown) => modalStore.setTopResponse(value),
    [],
  );
  const close = React.useCallback(() => modalStore.closeTop(), []);
  return <Component {...(entry.props as Record<string, unknown>)} close={close} setResponse={setResponse} />;
}
