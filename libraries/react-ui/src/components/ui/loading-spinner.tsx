import * as React from 'react';
import { cn } from '@/lib/utils';

const LoadingSpinner = React.forwardRef<
  HTMLSpanElement,
  React.ComponentPropsWithoutRef<'span'>
>(({ className, ...props }, ref) => {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn(
        "border-foreground after:border-b-primary relative box-border inline-block h-12 w-12 animate-spin rounded-full border-[3px] after:absolute after:left-1/2 after:top-1/2 after:box-border after:h-10 after:w-10 after:-translate-x-1/2 after:-translate-y-1/2 after:rounded-full after:border-[3px] after:border-transparent after:content-['']",
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
LoadingSpinner.displayName = 'LoadingSpinner';

export { LoadingSpinner };
