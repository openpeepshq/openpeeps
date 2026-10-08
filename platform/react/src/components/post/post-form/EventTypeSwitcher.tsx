import { Link, MapPin } from 'lucide-react';
import type { Event, Location } from '@openpeepshq/common/types';
import { Input, Label } from '@openpeepshq/react-ui';
import { useT } from '../../../i18n';
import {
  useEventTypeSwitcher,
  useLocationSearch,
} from '../../../hooks/events/useEventTypeSwitcher';
import { ProfilesInput } from '../../profile';

export type { EventFormat } from '../../../hooks/events/useEventTypeSwitcher';

export interface EventTypeSwitcherProps {
  event: Event;
  isEdit?: boolean;
  onChange: (event: Event) => void;
}

function SimpleLocationInput({
  value,
  onChange,
}: {
  value?: Location;
  onChange: (location: Location | undefined) => void;
}) {
  const t = useT();
  const { text, setText, suggestions, clearSuggestions, search } =
    useLocationSearch(value);

  return (
    <div className="relative space-y-1">
      <Label>{t('events.form.location', { defaultValue: 'Location' })}</Label>
      <div className="relative">
        <MapPin className="text-muted-foreground absolute left-3 top-2.5 size-4" />
        <Input
          className="pl-9"
          value={text}
          placeholder={t('events.form.locationPlaceholder', {
            defaultValue: 'Search for a place…',
          })}
          onChange={(e) => {
            setText(e.target.value);
            onChange({ text: e.target.value });
            search(e.target.value);
          }}
        />
      </div>
      {suggestions.length > 0 ? (
        <div className="bg-surface absolute z-10 mt-1 max-h-40 w-full overflow-y-auto rounded-md border shadow-md">
          {suggestions.map((item) => (
            <button
              key={`${item.name}-${item.center.lat}-${item.center.lng}`}
              type="button"
              className="hover:bg-surface w-full px-3 py-2 text-left text-sm"
              onClick={() => {
                setText(item.name);
                onChange({
                  text: item.name,
                  coordinates: item.center,
                });
                clearSuggestions();
              }}
            >
              {item.name}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function EventTypeSwitcher({
  event,
  isEdit = false,
  onChange,
}: EventTypeSwitcherProps) {
  const t = useT();
  const {
    eventFormat,
    formats,
    livekitEnabled,
    switchFormat,
    moderatorProfiles,
    setModerators,
    setWaitingRoom,
    setUrl,
    setPhysicalLocation,
  } = useEventTypeSwitcher({
    event,
    isEdit,
    onChange,
    origin: typeof window !== 'undefined' ? window.location.origin : '',
  });

  return (
    <div className="space-y-3">
      <Label
        title={t('events.form.eventFormat', { defaultValue: 'Event format' })}
      >
        <div className="mt-2 flex flex-col gap-2">
          {formats.map((format) => (
            <label key={format.value} className="flex w-fit items-center gap-2">
              <input
                type="radio"
                name="eventFormat"
                checked={eventFormat === format.value}
                disabled={format.value === 'jam' && !livekitEnabled}
                onChange={() => switchFormat(format.value)}
              />
              <span>{format.label}</span>
            </label>
          ))}
        </div>
      </Label>

      {eventFormat === 'in-person' ? (
        <SimpleLocationInput
          value={event.physicalLocation}
          onChange={setPhysicalLocation}
        />
      ) : null}

      {eventFormat === 'external' ? (
        <div className="space-y-1">
          <Label htmlFor="event-url">
            {t('events.form.externalFormatLabel', {
              defaultValue: 'External link',
            })}
          </Label>
          <div className="relative">
            <Link className="text-muted-foreground absolute left-3 top-2.5 size-4" />
            <Input
              id="event-url"
              className="pl-9"
              value={event.url ?? ''}
              placeholder={t('events.form.externalEventUrlPlaceholder', {
                defaultValue: 'https://…',
              })}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>
        </div>
      ) : null}

      {eventFormat === 'jam' ? (
        <>
          {!livekitEnabled ? (
            <p role="status" className="text-destructive text-sm">
              {t('jams.unavailable.message', {
                defaultValue:
                  'Jams are unavailable because LiveKit is not connected.',
              })}
            </p>
          ) : null}
          <div className="space-y-2">
            <Label>
              {t('events.form.jamModerators', {
                defaultValue: 'Jam moderators',
              })}
            </Label>
            <ProfilesInput
              value={moderatorProfiles}
              onChange={setModerators}
              disabled={!livekitEnabled}
              placeholder={t('events.form.jamModeratorsDescription', {
                defaultValue: 'Click to select jam moderators',
              })}
            />
          </div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={event.jam?.waitingRoom ?? false}
              disabled={!livekitEnabled}
              onChange={(e) => setWaitingRoom(e.target.checked)}
            />
            <span className="text-sm">
              {t('events.form.jamWaitingRoom', {
                defaultValue: 'Enable waiting room',
              })}
            </span>
          </label>
        </>
      ) : null}
    </div>
  );
}
