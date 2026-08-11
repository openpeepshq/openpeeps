import { Badge, type BadgeVariant } from './Badge';

export interface BadgesProps {
  data: { status: string; variant?: BadgeVariant }[];
}

export const Badges = ({ data }: BadgesProps) => (
  <div className="flex flex-wrap gap-1">
    {data.map(({ status, variant }, idx) => (
      <Badge key={idx} status={status} variant={variant} />
    ))}
  </div>
);
