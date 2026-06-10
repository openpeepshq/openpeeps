import type { ComponentType, ReactNode } from 'react';

export interface ModalControlProps<R = unknown> {
  close: () => void;
  setResponse: (r: R | undefined) => void;
}

export interface ModalEntry<P = Record<string, unknown>, R = unknown> {
  id: string;
  component: ComponentType<P & ModalControlProps<R>>;
  props: Omit<P, keyof ModalControlProps<R>>;
  response?: (r: R | undefined) => void | Promise<void>;
  setResponseValue?: R | undefined;
}

type Listener = () => void;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let stack: ModalEntry<any, any>[] = [];
const listeners = new Set<Listener>();
let counter = 0;

const emit = () => listeners.forEach((l) => l());

export const modalStore = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getStack: (): ModalEntry<any, any>[] => stack,
  subscribe: (listener: Listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  push: <P, R>(
    component: ComponentType<P & ModalControlProps<R>>,
    props: Omit<P, keyof ModalControlProps<R>>,
    response?: (r: R | undefined) => void | Promise<void>,
  ): string => {
    const id = `modal-${++counter}`;
    stack = [{ id, component, props, response }, ...stack];
    emit();
    return id;
  },
  closeTop: () => {
    if (stack.length === 0) return;
    const [top, ...rest] = stack;
    stack = rest;
    emit();
    if (!top) return;
    if (top.response) {
      void top.response(top.setResponseValue);
    }
  },
  closeAll: () => {
    stack = [];
    emit();
  },
  setTopResponse: <R,>(value: R | undefined) => {
    if (stack.length === 0) return;
    const top = stack[0];
    if (!top) return;
    top.setResponseValue = value;
    emit();
  },
};

/** Type-safe utility for "render this React node inside the modal stack". */
export const showNode = (node: ReactNode): string => {
  const Wrapper: ComponentType<ModalControlProps<unknown>> = () => (
    <>{node}</>
  );
  return modalStore.push<unknown, unknown>(Wrapper, {});
};
