import type { ComponentType } from 'react';
import { ErrorComponent } from './ErrorComponent';

const registry = new Map<string, ComponentType<Record<string, unknown>>>();

export const registerComponent = <P extends Record<string, unknown>>(
  key: string,
  component: ComponentType<P>,
) => {
  registry.set(key, component as ComponentType<Record<string, unknown>>);
};

const wrapMissing =
  (key: string, showError: boolean): ComponentType<Record<string, unknown>> =>
  () => (
    <ErrorComponent
      componentKey={key}
      registry={registry}
      showError={showError}
    />
  );

export const getComponent = <P extends Record<string, unknown>>(
  key: string,
  showError = true,
): ComponentType<P> => {
  const found = registry.get(key);
  return (
    (found as ComponentType<P>) ??
    (wrapMissing(key, showError) as ComponentType<P>)
  );
};

export { ErrorComponent };
export type { ErrorComponentProps } from './ErrorComponent';
