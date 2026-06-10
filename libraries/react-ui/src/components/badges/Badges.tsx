import { Badge } from './Badge';
import type { Variant } from '@/types';

export interface BadgesProps {
  data: { status: string; variant?: Variant }[];
}

export function Badges({ data }: BadgesProps) {
  return (
    <div className="flex flex-wrap gap-1">
      {data.map(({ status, variant }, idx) => (
        <Badge key={idx} status={status} variant={variant} />
      ))}
    </div>
  );
}
