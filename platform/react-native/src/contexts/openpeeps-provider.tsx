import React, {useCallback, type ComponentProps} from 'react';
import {AppState} from 'react-native';
import {OpenpeepsProvider as BaseOpenpeepsProvider} from '@openpeeps/react';

type BaseProps = ComponentProps<typeof BaseOpenpeepsProvider>;

/**
 * React Native flavor of `OpenpeepsProvider`. Identical to the web provider
 * exported by `@openpeeps/react`, but pre-wires `subscribeToForeground` to
 * React Native's `AppState` so token refresh happens when the app returns to
 * the foreground.
 *
 * `@openpeeps/react` deliberately has no `react-native` import — this wrapper
 * is the single place where the dependency lives. Host apps should import
 * `OpenpeepsProvider` from `@openpeeps/react-native` (not from
 * `@openpeeps/react`) so this wiring is in place.
 */
export const OpenpeepsProvider: React.FC<
  Omit<BaseProps, 'subscribeToForeground'>
> = props => {
  const subscribeToForeground = useCallback(
    (onForeground: () => void) => {
      const subscription = AppState.addEventListener('change', state => {
        if (state === 'active') onForeground();
      });
      return () => subscription.remove();
    },
    [],
  );

  return (
    <BaseOpenpeepsProvider
      {...props}
      subscribeToForeground={subscribeToForeground}
    />
  );
};
