import * as Slot from '@rn-primitives/slot';
import type {SlottableViewProps, ViewRef} from '@rn-primitives/types';
import * as React from 'react';
import {View as RNView} from 'react-native';
import {cn} from '~/lib/utils';

const ViewClassContext = React.createContext<string | undefined>(undefined);

const ThemedView = React.forwardRef<ViewRef, SlottableViewProps>(
  ({className, asChild = false, ...props}, ref) => {
    const viewClass = React.useContext(ViewClassContext);
    const Component = asChild ? Slot.View : RNView;
    return (
      <Component
        className={cn('bg-background', viewClass, className)}
        ref={ref}
        {...props}
      />
    );
  },
);
ThemedView.displayName = 'ThemedView';

export {ThemedView, ViewClassContext};
