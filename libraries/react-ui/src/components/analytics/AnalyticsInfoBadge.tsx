import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { cn } from '../../lib/utils';

export type AnalyticsInfoBadgeProps = {
  /** Accessible name for the control (usually the metric/section title). */
  label: string;
  /** Explanation of what the data means and how it is calculated. */
  info: string;
  className?: string;
};

export const AnalyticsInfoBadge = ({
  label,
  info,
  className,
}: AnalyticsInfoBadgeProps) => (
  <Popover>
    <PopoverTrigger asChild>
      <button
        type="button"
        className={cn(
          'text-muted-foreground hover:text-foreground hover:border-foreground/30 inline-flex size-4 shrink-0 items-center justify-center rounded-full border border-current text-[10px] font-semibold leading-none transition-colors',
          className,
        )}
        aria-label={`About ${label}`}
        onClick={(e) => e.stopPropagation()}
      >
        i
      </button>
    </PopoverTrigger>
    <PopoverContent
      align="end"
      className="w-72 p-3 text-sm leading-relaxed"
      onClick={(e) => e.stopPropagation()}
    >
      <p className="text-foreground font-medium">{label}</p>
      <p className="text-muted-foreground mt-1.5 whitespace-pre-wrap">{info}</p>
    </PopoverContent>
  </Popover>
);
