import { useState } from 'react';
import { X } from 'lucide-react';
import type {
  AudienceSetting,
  Event,
  EventRecurrence,
  PostCreationData,
  RecurrenceFreq,
  RecurrenceWeekday,
} from '@openpeepshq/common/types';
import {
  EVENT_HEADER_ASPECT_RATIO,
  parseEventMaxAttendeesInput,
  previewUpcomingOccurrences,
  weekdayFromDate,
  withoutEventMaxAttendees,
} from '@openpeepshq/common/lib';
import { Input, Label } from '@openpeepshq/react-ui';
import { useT } from '../../../i18n';
import { useCurrentProfile } from '../../layout/IdentityContext';
import { ImageInput } from '../../form/ImageInput';
import { OpenpeepsMarkdownInput } from './OpenpeepsMarkdownInput';
import { ComposePreviewLinks } from './ComposePreviewLinks';
import { EventTypeSwitcher } from './EventTypeSwitcher';
import { PostAudienceSelector } from './PostAudienceSelector';
import { VisibilitySelector } from './VisibilitySelector';

export interface EventFormProps {
  postData: PostCreationData;
  onChange: (data: PostCreationData) => void;
  isEdit?: boolean;
  occurrenceEdit?: boolean;
}

const dateToInputValue = (value: string | undefined) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const tz = d.getTimezoneOffset() * 60_000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 16);
};

const toIso = (value: string) => {
  if (!value) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
};

const TIMEZONES =
  typeof Intl !== 'undefined' && 'supportedValuesOf' in Intl
    ? Intl.supportedValuesOf('timeZone')
    : [Intl.DateTimeFormat().resolvedOptions().timeZone];

const WEEKDAYS: RecurrenceWeekday[] = [
  'MO',
  'TU',
  'WE',
  'TH',
  'FR',
  'SA',
  'SU',
];

export const EventForm = ({
  postData,
  onChange,
  isEdit = false,
  occurrenceEdit = false,
}: EventFormProps) => {
  const t = useT();
  const me = useCurrentProfile();

  const event = postData.data as Event;
  const [showEndDate, setShowEndDate] = useState(event.end !== undefined);
  const [audienceOpen, setAudienceOpen] = useState(false);

  const patchEvent = (patch: Partial<Event>) => {
    let next: Event = { ...event, ...patch };
    if ('maxAttendees' in patch && patch.maxAttendees === undefined) {
      next = withoutEventMaxAttendees(next);
    }
    onChange({
      ...postData,
      data: next,
    });
  };

  const setAudience = (settings: AudienceSetting) => {
    const audience = settings.audience ?? undefined;
    const includesMe = audience?.some((p) => p.id === me?.id);
    onChange({
      ...postData,
      visibility: settings.visibility,
      groupId: settings.groupId ?? undefined,
      audience:
        settings.visibility === 'direct'
          ? includesMe
            ? audience
            : [...(audience ?? []), ...(me ? [me] : [])]
          : undefined,
    });
  };

  const setRecurrence = (recurrence: EventRecurrence | undefined) => {
    patchEvent({ recurrence });
  };

  const repeatFreq: RecurrenceFreq | 'none' = event.recurrence?.freq ?? 'none';
  const repeatEnd = event.recurrence?.until
    ? 'until'
    : event.recurrence?.count
      ? 'count'
      : 'never';
  const preview = event.recurrence ? previewUpcomingOccurrences(event, 3) : [];

  const applyFreq = (freq: RecurrenceFreq | 'none') => {
    if (freq === 'none') {
      setRecurrence(undefined);
      return;
    }
    const next: EventRecurrence = {
      freq,
      interval: event.recurrence?.interval,
      until: event.recurrence?.until,
      count: event.recurrence?.count,
    };
    if (freq === 'WEEKLY') {
      next.byDay = event.recurrence?.byDay?.length
        ? event.recurrence.byDay
        : event.start
          ? [weekdayFromDate(new Date(event.start))]
          : ['MO'];
    }
    setRecurrence(next);
  };

  return (
    <div data-testid="events-form-basic-details">
      <ImageInput
        usage="event-header-image"
        url={event.image}
        onChange={(image) => patchEvent({ image })}
        aspectRatio={EVENT_HEADER_ASPECT_RATIO}
        className="aspect-video !h-auto"
        text={t('events.form.imageDescription', {
          defaultValue: 'Upload an image for your event',
        })}
        specsText={t('events.form.imageSpecs', {
          defaultValue:
            'Your image should be at least 800 pixels wide with a 16x9 aspect ratio.',
        })}
        showAltInput={false}
      />

      <div className="mt-4 flex flex-col gap-4 px-3">
        <h2 className="text-lg">
          {t('events.form.title', { defaultValue: 'Basic Details' })}
        </h2>

        <Label
          title={t('events.form.name', { defaultValue: 'Event name' })}
          htmlFor="event-name"
        >
          <Input
            id="event-name"
            value={event.name ?? ''}
            onChange={(e) => patchEvent({ name: e.target.value })}
            data-testid="events-name-input"
          />
        </Label>

        <p className="text-muted-foreground text-sm">
          {t('events.form.description', {
            defaultValue: 'Give your event a clear, descriptive name',
          })}
        </p>

        <OpenpeepsMarkdownInput
          rows={6}
          maxLength={5000}
          value={event.content ?? ''}
          onChange={(content) => patchEvent({ content })}
          testId="events-description-input"
          placeholder={t('events.form.descriptionPlaceholder', {
            defaultValue: 'Describe your event',
          })}
        />
        <ComposePreviewLinks content={event.content} />

        <h2 className="text-lg">
          {t('events.form.dateAndTimeTitle', {
            defaultValue: 'Date and Time',
          })}
        </h2>

        <Label
          title={t('events.form.startDate', { defaultValue: 'Start Date' })}
          htmlFor="event-start"
        >
          <Input
            id="event-start"
            type="datetime-local"
            step={60}
            value={dateToInputValue(event.start)}
            onChange={(e) => {
              const start = toIso(e.target.value);
              if (start) patchEvent({ start });
            }}
            data-testid="events-start-input"
          />
        </Label>

        <Label
          description={t('events.form.addEndDate', {
            defaultValue: 'Add end date and time',
          })}
          forCheckbox
        >
          <input
            type="checkbox"
            checked={showEndDate}
            onChange={(e) => {
              const checked = e.target.checked;
              setShowEndDate(checked);
              if (checked && event.start) {
                const end = new Date(event.start);
                end.setHours(end.getHours() + 1);
                patchEvent({ end: end.toISOString() });
              } else {
                patchEvent({ end: undefined });
              }
            }}
          />
        </Label>

        {showEndDate ? (
          <Label
            title={t('events.form.endDate', { defaultValue: 'End Date' })}
            htmlFor="event-end"
          >
            <Input
              id="event-end"
              type="datetime-local"
              step={60}
              value={dateToInputValue(event.end)}
              onChange={(e) => patchEvent({ end: toIso(e.target.value) })}
            />
          </Label>
        ) : null}

        <Label
          title={t('events.form.timezone', { defaultValue: 'Timezone' })}
          htmlFor="event-timezone"
        >
          <select
            id="event-timezone"
            className="bg-background w-full rounded-md border px-3 py-2 text-sm"
            value={event.timeZone ?? TIMEZONES[0]}
            onChange={(e) => patchEvent({ timeZone: e.target.value })}
          >
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
        </Label>

        {!occurrenceEdit ? (
          <>
            <Label
              title={t('events.form.repeat.title', { defaultValue: 'Repeat' })}
              htmlFor="event-repeat"
            >
              <select
                id="event-repeat"
                className="bg-background w-full rounded-md border px-3 py-2 text-sm"
                value={repeatFreq}
                onChange={(e) =>
                  applyFreq(e.target.value as RecurrenceFreq | 'none')
                }
                data-testid="events-repeat-input"
              >
                <option value="none">
                  {t('events.form.repeat.none', {
                    defaultValue: 'Does not repeat',
                  })}
                </option>
                <option value="DAILY">
                  {t('events.form.repeat.daily', { defaultValue: 'Daily' })}
                </option>
                <option value="WEEKLY">
                  {t('events.form.repeat.weekly', { defaultValue: 'Weekly' })}
                </option>
                <option value="MONTHLY">
                  {t('events.form.repeat.monthly', { defaultValue: 'Monthly' })}
                </option>
              </select>
            </Label>

            {event.recurrence?.freq === 'WEEKLY' ? (
              <div>
                <p className="mb-2 text-sm">
                  {t('events.form.repeat.weekdays', {
                    defaultValue: 'Repeat on',
                  })}
                </p>
                <div className="flex flex-wrap gap-2">
                  {WEEKDAYS.map((day) => {
                    const selected = event.recurrence?.byDay?.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        className={`rounded-md border px-2 py-1 text-sm ${
                          selected
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-background'
                        }`}
                        onClick={() => {
                          const current = event.recurrence?.byDay ?? [];
                          const next = selected
                            ? current.filter((value) => value !== day)
                            : [...current, day];
                          setRecurrence({
                            ...event.recurrence!,
                            byDay:
                              next.length > 0
                                ? next
                                : [weekdayFromDate(new Date(event.start))],
                          });
                        }}
                      >
                        {t(`events.form.repeat.day.${day}`, {
                          defaultValue: day,
                        })}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {event.recurrence ? (
              <>
                <Label
                  title={t('events.form.repeat.end', {
                    defaultValue: 'Ends',
                  })}
                  htmlFor="event-repeat-end"
                >
                  <select
                    id="event-repeat-end"
                    className="bg-background w-full rounded-md border px-3 py-2 text-sm"
                    value={repeatEnd}
                    onChange={(e) => {
                      const mode = e.target.value;
                      if (mode === 'never') {
                        setRecurrence({
                          ...event.recurrence!,
                          until: undefined,
                          count: undefined,
                        });
                      } else if (mode === 'until') {
                        setRecurrence({
                          ...event.recurrence!,
                          count: undefined,
                          until:
                            event.recurrence?.until ??
                            new Date(
                              Date.now() + 90 * 24 * 60 * 60 * 1000,
                            ).toISOString(),
                        });
                      } else {
                        setRecurrence({
                          ...event.recurrence!,
                          until: undefined,
                          count: event.recurrence?.count ?? 10,
                        });
                      }
                    }}
                  >
                    <option value="never">
                      {t('events.form.repeat.never', { defaultValue: 'Never' })}
                    </option>
                    <option value="until">
                      {t('events.form.repeat.onDate', {
                        defaultValue: 'On date',
                      })}
                    </option>
                    <option value="count">
                      {t('events.form.repeat.after', {
                        defaultValue: 'After a number of events',
                      })}
                    </option>
                  </select>
                </Label>
                {repeatEnd === 'until' ? (
                  <Label
                    title={t('events.form.repeat.onDate', {
                      defaultValue: 'On date',
                    })}
                    htmlFor="event-repeat-until"
                  >
                    <Input
                      id="event-repeat-until"
                      type="datetime-local"
                      step={60}
                      value={dateToInputValue(event.recurrence.until)}
                      onChange={(e) =>
                        setRecurrence({
                          ...event.recurrence!,
                          until: toIso(e.target.value),
                          count: undefined,
                        })
                      }
                    />
                  </Label>
                ) : null}
                {repeatEnd === 'count' ? (
                  <Label
                    title={t('events.form.repeat.count', {
                      defaultValue: 'Number of events',
                    })}
                    htmlFor="event-repeat-count"
                  >
                    <Input
                      id="event-repeat-count"
                      type="number"
                      min={1}
                      value={event.recurrence.count ?? 10}
                      onChange={(e) =>
                        setRecurrence({
                          ...event.recurrence!,
                          count: Math.max(1, Number(e.target.value) || 1),
                          until: undefined,
                        })
                      }
                    />
                  </Label>
                ) : null}
                {preview.length > 0 ? (
                  <p className="text-muted-foreground text-sm">
                    {t('events.form.repeat.preview', {
                      defaultValue: 'Next dates: {{dates}}',
                      dates: preview
                        .map((occurrence) =>
                          new Date(occurrence.start).toLocaleDateString(
                            undefined,
                            {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                            },
                          ),
                        )
                        .join(', '),
                    })}
                  </p>
                ) : null}
              </>
            ) : null}
          </>
        ) : null}

        <h2 className="text-lg">
          {t('events.form.location', { defaultValue: 'Location' })}
        </h2>

        <EventTypeSwitcher
          event={event}
          isEdit={isEdit}
          onChange={(next) => onChange({ ...postData, data: next })}
        />

        <h2 className="text-lg">
          {t('events.form.people', { defaultValue: 'People' })}
        </h2>

        <Label
          title={t('events.form.visibility', { defaultValue: 'Visibility' })}
          description={t('events.form.visibilityNotChangeable', {
            defaultValue:
              "Note:  The event visibility cannot be changed once the event is published.  Make sure you're adding the right people or group.",
          })}
        >
          <VisibilitySelector
            postData={postData}
            onClick={() => setAudienceOpen(true)}
            disabled={isEdit}
            showDirect
          />
        </Label>

        <Label
          description={t('events.form.attendeeListPublic', {
            defaultValue: 'Let an attendee see others attending this event',
          })}
          forCheckbox
        >
          <input
            type="checkbox"
            checked={event.attendeeListPublic ?? false}
            onChange={(e) =>
              patchEvent({ attendeeListPublic: e.target.checked })
            }
          />
        </Label>

        <Label
          title={t('events.form.maxAttendees', {
            defaultValue: 'Maximum attendees',
          })}
          description={t('events.form.maxAttendeesDescription', {
            defaultValue:
              'Limit how many people can RSVP yes to this event. Leave empty for no limit.',
          })}
        >
          <div className="op-input-group grid grid-cols-[1fr_auto]">
            <Input
              type="number"
              min={1}
              value={event.maxAttendees ?? ''}
              onChange={(e) => {
                patchEvent({
                  maxAttendees: parseEventMaxAttendeesInput(e.target.value),
                });
              }}
            />
            {event.maxAttendees != null ? (
              <button
                type="button"
                className="op-input-group-shim hover:bg-surface/80"
                title={t('events.form.clearMaxAttendees', {
                  defaultValue: 'Remove capacity limit',
                })}
                onClick={() => patchEvent({ maxAttendees: undefined })}
              >
                <X className="size-4" />
              </button>
            ) : null}
          </div>
        </Label>
      </div>

      {!isEdit ? (
        <PostAudienceSelector
          open={audienceOpen}
          onClose={() => setAudienceOpen(false)}
          type="event"
          visibility={postData.visibility}
          groupId={postData.groupId ?? undefined}
          audience={postData.audience ?? []}
          showDirect
          onConfirm={setAudience}
        />
      ) : null}
    </div>
  );
};
