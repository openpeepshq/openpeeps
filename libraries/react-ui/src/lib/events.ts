import type { SyntheticEvent } from 'react';

type AnyEvent = Event | SyntheticEvent;

export const preventDefault =
  <T extends AnyEvent>(handler?: (event: T, ...args: unknown[]) => unknown | Promise<unknown>) =>
  (event: T, ...args: unknown[]) => {
    event.preventDefault();
    return handler?.(event, ...args);
  };

export const stopPropagation =
  <T extends AnyEvent>(handler?: (event: T, ...args: unknown[]) => unknown | Promise<unknown>) =>
  (event: T, ...args: unknown[]) => {
    event.stopPropagation();
    return handler?.(event, ...args);
  };
