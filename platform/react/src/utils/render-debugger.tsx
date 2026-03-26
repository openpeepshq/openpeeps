/**
 * React Component Re-render Debugging Utilities
 * 
 * Use these helpers to debug why components are re-rendering
 */

import React, { useEffect, useRef } from 'react';

/**
 * Hook to log component re-renders with props/state changes
 * 
 * Usage:
 *   function MyComponent(props) {
 *     useWhyDidYouUpdate('MyComponent', props);
 *     return <div>...</div>;
 *   }
 */
export const useWhyDidYouUpdate = (name: string, props: Record<string, unknown>) => {
  // Get a mutable ref object where we can store props for comparison next time
  const previousProps = useRef<Record<string, unknown>>();

  useEffect(() => {
    if (previousProps.current) {
      // Get all keys from previous and current props
      const allKeys = Object.keys({ ...previousProps.current, ...props });

      // Use this object to keep track of changed props
      const changedProps: Record<string, { from: unknown; to: unknown }> = {};

      // Iterate through keys
      allKeys.forEach((key) => {
        // If previous is different from current
        if (previousProps.current![key] !== props[key]) {
          // Add to changedProps
          changedProps[key] = {
            from: previousProps.current![key],
            to: props[key],
          };
        }
      });

      // If changedProps is not empty, log to console
      if (Object.keys(changedProps).length) {
        console.log('[why-did-you-update]', name, changedProps);
      }
    }

    // Finally update previousProps with current props for next render
    previousProps.current = props;
  });
}

/**
 * Hook to track render count and log when component renders
 * 
 * Usage:
 *   function MyComponent() {
 *     useRenderCount('MyComponent');
 *     return <div>...</div>;
 *   }
 */
export const useRenderCount = (componentName: string) => {
  const renderCount = useRef(0);
  renderCount.current += 1;

  useEffect(() => {
    console.log(`[render-count] ${componentName} rendered ${renderCount.current} times`);
  });

  return renderCount.current;
}

/**
 * Hook to log what dependencies changed in useEffect/useMemo/useCallback
 * 
 * Usage:
 *   useEffect(() => {
 *     // your effect
 *   }, useDependencyTracker([dep1, dep2, dep3], 'MyComponent effect'));
 */
export const useDependencyTracker = (
  deps: any[],
  label: string
): any[] => {
  const prevDeps = useRef<any[]>();

  useEffect(() => {
    if (prevDeps.current) {
      const changedDeps = deps.reduce((acc, dep, index) => {
        if (dep !== prevDeps.current![index]) {
          acc.push({
            index,
            from: prevDeps.current![index],
            to: dep,
          });
        }
        return acc;
      }, [] as Array<{ index: number; from: any; to: any }>);

      if (changedDeps.length > 0) {
        console.log(`[dependency-change] ${label}:`, changedDeps);
      }
    }
    prevDeps.current = deps;
  });

  return deps;
}

/**
 * Higher-order component to track renders
 * 
 * Usage:
 *   export default withRenderTracking(MyComponent, 'MyComponent');
 */
export const withRenderTracking = <P extends object>(
  Component: React.ComponentType<P>,
  componentName: string
) => (props: P) => {
  useRenderCount(componentName);
  useWhyDidYouUpdate(componentName, props as Record<string, any>);
  return <Component {...props} />;
};

