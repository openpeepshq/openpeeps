import * as React from 'react';
import { cn } from '@/lib/utils';

const LoadingSpinner = React.forwardRef<
  HTMLSpanElement,
  React.ComponentPropsWithoutRef<'span'>
>(({ className, ...props }, ref) => {
  return <span className={cn("inline-block relative box-border w-12 h-12 rounded-full border-[3px] border-foreground animate-spin after:content-[''] after:box-border after:absolute after:left-1/2 after:top-1/2 after:-translate-x-1/2 after:-translate-y-1/2 after:w-10 after:h-10 after:rounded-full after:border-[3px] after:border-transparent after:border-b-primary ", className)} ref={ref} {...props} />;
});
LoadingSpinner.displayName = 'LoadingSpinner';

export { LoadingSpinner };
