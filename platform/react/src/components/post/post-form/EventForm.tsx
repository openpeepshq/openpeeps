import { useState } from 'react';
import { X } from 'lucide-react';
import type {
  PostCreationData,
  RecurrenceFreq,
} from '@openpeepshq/common/types';
import {
  EVENT_HEADER_ASPECT_RATIO,
  parseEventMaxAttendeesInput,
  utcIsoToZonedDateTime,
  zonedDateTimeToUtcIso,
} from '@openpeepshq/common/lib';
import { Input, Label } from '@openpeepshq/react-ui';
import { useT } from '../../../i18n';
import {
  EVENT_WEEKDAYS,
  useEventForm,
  type RepeatEnd,
} from '../../../hooks/events/useEventForm';
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

const dateToInputValue = (value: string | undefined, timeZone: string) =>
  value ? utcIsoToZonedDateTime(value, timeZone) : '';

const toIso = (value: string, timeZone: string) =>
  zonedDateTimeToUtcIso(value, timeZone);

const TIMEZONES =
  typeof Intl !== 'undefined' && 'supportedValuesOf' in Intl
    ? Intl.supportedValuesOf('timeZone')
    : [Intl.DateTimeFormat().resolvedOptions().timeZone];

export const EventForm = ({
  postData,
  onChange,
  isEdit = false,
  occurrenceEdit = false,
}: EventFormProps) => {
  const t = useT();
  const [audienceOpen, setAudienceOpen] = useState(false);
  const {
    event,
    eventTimeZone,
    showEndDate,
    repeatFreq,
    repeatEnd,
    preview,
    patchEvent,
    setEvent,
    setAudience,
    applyFreq,
    toggleWeekday,
    applyRepeatEnd,
    setRepeatUntil,
    setRepeatCount,
    toggleEndDate,
    setTimeZone,
  } = useEventForm(postData, onChange);

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
            value={dateToInputValue(event.start, eventTimeZone)}
            onChange={(e) => {
              const start = toIso(e.target.value, eventTimeZone);
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
            onChange={(e) => toggleEndDate(e.target.checked)}
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
              value={dateToInputValue(event.end, eventTimeZone)}
              onChange={(e) =>
                patchEvent({ end: toIso(e.target.value, eventTimeZone) })
              }
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
            value={eventTimeZone}
            onChange={(e) => setTimeZone(e.target.value)}
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
                  {EVENT_WEEKDAYS.map((day) => {
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
                        onClick={() => toggleWeekday(day)}
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
                    onChange={(e) =>
                      applyRepeatEnd(e.target.value as RepeatEnd)
                    }
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
                      value={dateToInputValue(
                        event.recurrence.until,
                        eventTimeZone,
                      )}
                      onChange={(e) =>
                        setRepeatUntil(toIso(e.target.value, eventTimeZone))
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
                      onChange={(e) => setRepeatCount(e.target.value)}
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

        <EventTypeSwitcher event={event} isEdit={isEdit} onChange={setEvent} />

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
