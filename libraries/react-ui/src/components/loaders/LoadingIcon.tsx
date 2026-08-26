import { LoadingSpinner } from '@/components/ui/loading-spinner';

/**
 * @deprecated Use {@link LoadingSpinner} instead.
 */
export interface LoadingIconProps {
  className?: string;
}

/**
 * @deprecated Use {@link LoadingSpinner} instead.
 */
export const LoadingIcon = ({ className }: LoadingIconProps) => (
  <LoadingSpinner className={className} />
);
