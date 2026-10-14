import { useEffect, useState } from 'react';
import type { PublicPost } from '@openpeepshq/common/types';
import type { ExpandedOccurrence } from '@openpeepshq/common/lib';
import {
  canClaimYesRsvp,
  canJoinWaitlist,
  seriesClaimBlocked,
} from '@openpeepshq/common/lib';
import type { RsvpScopeChoice } from '../../../hooks/events/useEventRsvp';
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

export type { RsvpScopeChoice };

export type EventRsvpScopeDialogProps = {
  open: boolean;
  post: PublicPost;
  response: 'yes' | 'tentative' | 'no' | 'waitlist';
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
  const joiningWaitlist = response === 'waitlist';
  const seriesFull =
    response === 'yes' && !!profile && seriesClaimBlocked(post, profile.id);
  const occurrenceIsFull = (recurrenceId: string) => {
    if (!profile) return false;
    if (joiningWaitlist)
      return !canJoinWaitlist(post, profile.id, recurrenceId);
    if (response !== 'yes') return false;
    return !canClaimYesRsvp(post, profile.id, recurrenceId);
  };
  const currentFull =
    !!defaultRecurrenceId && occurrenceIsFull(defaultRecurrenceId);
  const initialScope: ScopeKind = currentFull
    ? 'selected'
    : defaultRecurrenceId
      ? 'this'
      : 'series';
  const [scope, setScope] = useState<ScopeKind>(initialScope);
  const [selected, setSelected] = useState<string[]>(
    defaultRecurrenceId ? [defaultRecurrenceId] : [],
  );

  useEffect(() => {
    if (!open) return;
    setScope(initialScope);
    setSelected(defaultRecurrenceId ? [defaultRecurrenceId] : []);
  }, [open, defaultRecurrenceId, initialScope]);

  const defaultLabel = defaultRecurrenceId
    ? formatOccurrenceStart(
        occurrences.find(
          (occurrence) => occurrence.recurrenceId === defaultRecurrenceId,
        )?.start ?? defaultRecurrenceId,
      )
    : undefined;

  const openSelected = selected.filter((id) => !occurrenceIsFull(id));
  const confirmDisabled =
    !!submitting ||
    (scope === 'this' && !defaultRecurrenceId) ||
    (scope === 'selected' && openSelected.length === 0) ||
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
      return onConfirm({ kind: 'selected', recurrenceIds: openSelected });
    }
    return onConfirm({ kind: 'series' });
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[85vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {joiningWaitlist
              ? t('events.rsvp.scope.waitlistTitle', {
                  defaultValue: 'Join the waitlist for which dates?',
                })
              : t('events.rsvp.scope.title', {
                  defaultValue: 'Which dates?',
                })}
          </DialogTitle>
        </DialogHeader>
        <RadioGroup
          value={scope}
          onValueChange={(value) => setScope(value as ScopeKind)}
          className="gap-3"
        >
          {defaultRecurrenceId && !currentFull ? (
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
          {currentFull || joiningWaitlist ? null : (
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
          )}
        </RadioGroup>
        {scope === 'selected' ? (
          <ScrollArea className="h-48">
            <ul className="space-y-2 pr-3">
              {occurrences.map((occurrence) => {
                const full = occurrenceIsFull(occurrence.recurrenceId);
                const lockedOn =
                  full && occurrence.recurrenceId === defaultRecurrenceId;
                const checked =
                  lockedOn || selected.includes(occurrence.recurrenceId);
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
                          ? ` — ${
                              joiningWaitlist
                                ? t('events.rsvp.spotsOpen', {
                                    defaultValue: 'Spots still open',
                                  })
                                : t('events.rsvp.full', {
                                    defaultValue: 'Event is full',
                                  })
                            }`
                          : ''}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </ScrollArea>
        ) : null}
        {scope === 'selected' && openSelected.length === 0 ? (
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
          actionLabel={
            joiningWaitlist
              ? t('events.rsvp.joinWaitlist', {
                  defaultValue: 'Join waitlist',
                })
              : t('events.rsvp.scope.confirm', {
                  defaultValue: 'Confirm',
                })
          }
          onAction={confirm}
          disabled={confirmDisabled}
        />
      </DialogContent>
    </Dialog>
  );
};
