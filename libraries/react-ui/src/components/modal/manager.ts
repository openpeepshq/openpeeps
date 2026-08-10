import { useMemo } from 'react';
import type { ComponentType } from 'react';
import { modalStore, type ModalControlProps } from './store';

export interface ModalManager {
  show: <P, R = unknown>(
    component: ComponentType<P & ModalControlProps<R>>,
    props?: Omit<P, keyof ModalControlProps<R>>,
    callback?: (response: R | undefined) => void | Promise<void>,
  ) => string;
  close: () => void;
  closeAll: () => void;
}

/** Headless API mirroring `getModalManager()` from @openpeepshq/ui — works
 * outside React components. */
export const getModalManager = (): ModalManager => ({
  show: (component, props, callback) =>
    modalStore.push(
      component as ComponentType<unknown & ModalControlProps<unknown>>,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (props ?? {}) as any,
      callback as ((response: unknown) => void | Promise<void>) | undefined,
    ),
  close: () => modalStore.closeTop(),
  closeAll: () => modalStore.closeAll(),
});

/** React-friendly variant — returns a stable manager via useMemo. */
export const useModalManager = (): ModalManager => {
  return useMemo(() => getModalManager(), []);
};
