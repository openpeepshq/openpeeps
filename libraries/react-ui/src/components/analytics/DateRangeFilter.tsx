import { useMemo, useState } from 'react';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  formatISO,
  isAfter,
  isBefore,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  ShadcnButton,
} from '../ui';

export type AnalyticsPreset =
  | '7d'
  | '30d'
  | '3m'
  | '6m'
  | '12m'
  | 'all'
  | 'custom';

export type DateRangeValue = {
  preset?: Exclude<AnalyticsPreset, 'custom'>;
  from?: string;
  to?: string;
};

export type DateRangeFilterProps = {
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
  className?: string;
  /** Compact control suitable for page header actions. */
  compact?: boolean;
};

const PRESETS: Array<{ key: AnalyticsPreset; label: string }> = [
  { key: '7d', label: '7d' },
  { key: '30d', label: '30d' },
  { key: '3m', label: '3m' },
  { key: '6m', label: '6m' },
  { key: '12m', label: '12m' },
  { key: 'all', label: 'All' },
  { key: 'custom', label: 'Custom' },
];

const dayString = (d: Date) =>
  formatISO(startOfDay(d), { representation: 'date' });

const parseDay = (value?: string) =>
  value ? startOfDay(parseISO(value)) : undefined;

const MonthCalendar = ({
  title,
  month,
  onMonthChange,
  selected,
  onSelect,
  rangeStart,
  rangeEnd,
}: {
  title: string;
  month: Date;
  onMonthChange: (month: Date) => void;
  selected?: Date;
  onSelect: (day: Date) => void;
  rangeStart?: Date;
  rangeEnd?: Date;
}) => {
  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [month]);

  return (
    <div className="w-[252px]">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </div>
      <div className="mb-2 flex items-center justify-between">
        <ShadcnButton
          type="button"
          size="sm"
          variant="ghost"
          className="size-8 p-0"
          aria-label="Previous month"
          onClick={() => onMonthChange(subMonths(month, 1))}
        >
          <ChevronLeft className="size-4" />
        </ShadcnButton>
        <div className="text-sm font-medium">{format(month, 'MMMM yyyy')}</div>
        <ShadcnButton
          type="button"
          size="sm"
          variant="ghost"
          className="size-8 p-0"
          aria-label="Next month"
          onClick={() => onMonthChange(addMonths(month, 1))}
        >
          <ChevronRight className="size-4" />
        </ShadcnButton>
      </div>
      <div className="mb-1 grid grid-cols-7 gap-0.5 text-center text-[10px] font-medium uppercase text-muted-foreground">
        {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {days.map((day) => {
          const inMonth = isSameMonth(day, month);
          const isSelected = selected ? isSameDay(day, selected) : false;
          const inRange =
            rangeStart &&
            rangeEnd &&
            !isBefore(day, rangeStart) &&
            !isAfter(day, rangeEnd);
          return (
            <button
              key={day.toISOString()}
              type="button"
              disabled={!inMonth}
              onClick={() => onSelect(day)}
              className={cn(
                'h-8 rounded-md text-sm tabular-nums transition-colors',
                !inMonth && 'invisible',
                inMonth && !isSelected && 'hover:bg-accent',
                inRange && !isSelected && 'bg-accent/60',
                isSelected &&
                  'bg-foreground text-background hover:bg-foreground',
              )}
            >
              {format(day, 'd')}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export const DateRangeFilter = ({
  value,
  onChange,
  className,
  compact = false,
}: DateRangeFilterProps) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [draftFrom, setDraftFrom] = useState<string | undefined>(value.from);
  const [draftTo, setDraftTo] = useState<string | undefined>(value.to);
  const [startMonth, setStartMonth] = useState(() =>
    startOfMonth(parseDay(value.from) ?? subDays(new Date(), 29)),
  );
  const [endMonth, setEndMonth] = useState(() =>
    startOfMonth(parseDay(value.to) ?? new Date()),
  );

  const active: AnalyticsPreset =
    value.preset ?? (value.from && value.to ? 'custom' : '30d');

  const openCustomDialog = () => {
    const from =
      value.from ?? dayString(subDays(startOfDay(new Date()), 29));
    const to = value.to ?? dayString(startOfDay(new Date()));
    setDraftFrom(from);
    setDraftTo(to);
    setStartMonth(startOfMonth(parseISO(from)));
    setEndMonth(startOfMonth(parseISO(to)));
    setDialogOpen(true);
  };

  const draftFromDate = parseDay(draftFrom);
  const draftToDate = parseDay(draftTo);
  const canApply = Boolean(draftFrom && draftTo);

  return (
    <div
      className={cn(
        'flex flex-col gap-2',
        compact ? 'items-end' : undefined,
        className,
      )}
    >
      <div
        className={cn(
          'bg-background flex flex-wrap gap-0.5 rounded-lg border p-0.5',
          compact ? 'justify-end' : undefined,
        )}
      >
        {PRESETS.map((p) => (
          <ShadcnButton
            key={p.key}
            type="button"
            size="sm"
            variant={active === p.key ? 'default' : 'ghost'}
            className={cn(
              'h-7 px-2.5 text-xs',
              active === p.key ? undefined : 'text-muted-foreground',
            )}
            onClick={() => {
              if (p.key === 'custom') {
                openCustomDialog();
                return;
              }
              setDialogOpen(false);
              onChange({ preset: p.key });
            }}
          >
            {p.label}
          </ShadcnButton>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-fit">
          <DialogHeader>
            <DialogTitle>Custom date range</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-6 sm:flex-row sm:gap-8">
            <MonthCalendar
              title="Start"
              month={startMonth}
              onMonthChange={setStartMonth}
              selected={draftFromDate}
              rangeStart={draftFromDate}
              rangeEnd={draftToDate}
              onSelect={(day) => {
                const next = dayString(day);
                setDraftFrom(next);
                if (draftTo && isAfter(day, parseISO(draftTo))) {
                  setDraftTo(next);
                }
              }}
            />
            <MonthCalendar
              title="End"
              month={endMonth}
              onMonthChange={setEndMonth}
              selected={draftToDate}
              rangeStart={draftFromDate}
              rangeEnd={draftToDate}
              onSelect={(day) => {
                const next = dayString(day);
                setDraftTo(next);
                if (draftFrom && isBefore(day, parseISO(draftFrom))) {
                  setDraftFrom(next);
                }
              }}
            />
          </div>
          <DialogFooter className="gap-2 sm:justify-between">
            <p className="text-muted-foreground self-center text-sm tabular-nums">
              {draftFrom ?? '—'} → {draftTo ?? '—'}
            </p>
            <div className="flex gap-2">
              <ShadcnButton
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </ShadcnButton>
              <ShadcnButton
                type="button"
                disabled={!canApply}
                onClick={() => {
                  if (!draftFrom || !draftTo) return;
                  onChange({ from: draftFrom, to: draftTo });
                  setDialogOpen(false);
                }}
              >
                Apply
              </ShadcnButton>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
