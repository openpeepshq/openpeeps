import { useEffect, useState } from 'react';
import type { PublicPost } from '@openpeepshq/common/types';
import type { ExpandedOccurrence } from '@openpeepshq/common/lib';
import {
  countYesRsvps,
  getEffectiveRsvp,
  isCapacityEvent,
  seriesYesBlockedByCapacity,
} from '@openpeepshq/common/lib';
import {
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogHeader,
  DialogTitle,
  RadioGroup,
  RadioGroupItem,
  ScrollArea,
} from '@openpeepshq/react-ui';
import { useT } from '../../../i18n';
import { useCurrentProfile } from '../../layout/IdentityContext';

export type RsvpScopeChoice =
  | { kind: 'this'; recurrenceId: string }
  | { kind: 'selected'; recurrenceIds: string[] }
  | { kind: 'series' };

export type EventRsvpScopeDialogProps = {
  open: boolean;
  post: PublicPost;
  response: 'yes' | 'tentative' | 'no';
  defaultRecurrenceId?: string;
  occurrences: ExpandedOccurrence[];
  error?: string | null;
  submitting?: boolean;
  onClose: () => void;
  onConfirm: (scope: RsvpScopeChoice) => void | Promise<void>;
};

type ScopeKind = 'this' | 'selected' | 'series';

const formatOccurrenceStart = (start: string) =>
  new Date(start).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

export const EventRsvpScopeDialog = ({
  open,
  post,
  response,
  defaultRecurrenceId,
  occurrences,
  error,
  submitting,
  onClose,
  onConfirm,
}: EventRsvpScopeDialogProps) => {
  const t = useT();
  const profile = useCurrentProfile();
  const event = post.data?.type === 'event' ? post.data : undefined;
  const capacityEvent = event ? isCapacityEvent(event) : false;
  const seriesFull =
    response === 'yes' &&
    !!profile &&
    seriesYesBlockedByCapacity(post, profile.id);
  const [scope, setScope] = useState<ScopeKind>(
    defaultRecurrenceId ? 'this' : 'series',
  );
  const [selected, setSelected] = useState<string[]>(
    defaultRecurrenceId ? [defaultRecurrenceId] : [],
  );

  useEffect(() => {
    if (!open) return;
    setScope(defaultRecurrenceId ? 'this' : 'series');
    setSelected(defaultRecurrenceId ? [defaultRecurrenceId] : []);
  }, [open, defaultRecurrenceId]);

  const defaultLabel = defaultRecurrenceId
    ? formatOccurrenceStart(
        occurrences.find(
          (occurrence) => occurrence.recurrenceId === defaultRecurrenceId,
        )?.start ?? defaultRecurrenceId,
      )
    : undefined;

  const confirmDisabled =
    !!submitting ||
    (scope === 'this' && !defaultRecurrenceId) ||
    (scope === 'selected' && selected.length === 0) ||
    (scope === 'series' && seriesFull);

  const toggleSelected = (recurrenceId: string, next: boolean) => {
    setSelected((ids) =>
      next ? [...ids, recurrenceId] : ids.filter((id) => id !== recurrenceId),
    );
  };

  const confirm = () => {
    if (scope === 'this' && defaultRecurrenceId) {
      return onConfirm({
        kind: 'this',
        recurrenceId: defaultRecurrenceId,
      });
    }
    if (scope === 'selected') {
      return onConfirm({ kind: 'selected', recurrenceIds: selected });
    }
    return onConfirm({ kind: 'series' });
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[85vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {t('events.rsvp.scope.title', {
              defaultValue: 'Which dates?',
            })}
          </DialogTitle>
        </DialogHeader>
        <RadioGroup
          value={scope}
          onValueChange={(value) => setScope(value as ScopeKind)}
          className="gap-3"
        >
          {defaultRecurrenceId ? (
            <label className="flex items-center gap-2 text-sm">
              <RadioGroupItem value="this" />
              {t('events.rsvp.scope.thisDateWith', {
                defaultValue: 'This date ({{date}})',
                date: defaultLabel,
              })}
            </label>
          ) : null}
          {occurrences.length > 0 ? (
            <label className="flex items-center gap-2 text-sm">
              <RadioGroupItem value="selected" />
              {t('events.rsvp.scope.selectedDates', {
                defaultValue: 'Selected dates',
              })}
            </label>
          ) : null}
          <label className="flex items-start gap-2 text-sm">
            <RadioGroupItem value="series" disabled={seriesFull} />
            <span>
              {t('events.rsvp.scope.wholeSeries', {
                defaultValue: 'All dates in the series',
              })}
              {seriesFull ? (
                <span className="text-muted-foreground mt-1 block text-xs">
                  {t('events.rsvp.scope.seriesFull', {
                    defaultValue: 'Some dates in this series are full.',
                  })}
                </span>
              ) : null}
            </span>
          </label>
        </RadioGroup>
        {scope === 'selected' ? (
          <ScrollArea className="h-48">
            <ul className="space-y-2 pr-3">
              {occurrences.map((occurrence) => {
                const current = getEffectiveRsvp(
                  post,
                  profile?.id ?? '',
                  occurrence.recurrenceId,
                );
                const full =
                  response === 'yes' &&
                  capacityEvent &&
                  event?.maxAttendees !== undefined &&
                  current?.response !== 'yes' &&
                  countYesRsvps(post, occurrence.recurrenceId) >=
                    event.maxAttendees;
                const checked = selected.includes(occurrence.recurrenceId);
                return (
                  <li key={occurrence.recurrenceId}>
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={checked}
                        disabled={full}
                        onCheckedChange={(value) =>
                          toggleSelected(
                            occurrence.recurrenceId,
                            value === true,
                          )
                        }
                      />
                      <span className={full ? 'text-muted-foreground' : ''}>
                        {formatOccurrenceStart(occurrence.start)}
                        {full
                          ? ` — ${t('events.rsvp.full', {
                              defaultValue: 'Event is full',
                            })}`
                          : ''}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </ScrollArea>
        ) : null}
        {scope === 'selected' && selected.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            {t('events.rsvp.scope.selectAtLeastOne', {
              defaultValue: 'Select at least one date.',
            })}
          </p>
        ) : null}
        {error ? <p className="text-error text-sm">{error}</p> : null}
        <DialogActions
          cancelLabel={t('events.rsvp.scope.cancel', {
            defaultValue: 'Cancel',
          })}
          onCancel={onClose}
          actionLabel={t('events.rsvp.scope.confirm', {
            defaultValue: 'Confirm',
          })}
          onAction={confirm}
          disabled={confirmDisabled}
        />
      </DialogContent>
    </Dialog>
  );
};
