import { cn } from '@/lib/utils';
import { badgeVariants } from '@/components/ui/badge';

/** Badge surfaces aligned with theme badge tokens. */
export type BadgeVariant =
  | 'default'
  | 'secondary'
  | 'destructive'
  | 'outline'
  | 'success'
  | 'warning';

export interface BadgeProps {
  status: string;
  variant?: BadgeVariant;
  className?: string;
}

export const Badge = ({
  status,
  variant = 'default',
  className,
}: BadgeProps) => (
  <span className={cn(badgeVariants({ variant }), 'op-badge', className)}>
    {status}
  </span>
);
