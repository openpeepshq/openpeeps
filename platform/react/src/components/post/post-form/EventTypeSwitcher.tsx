import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, MapPin } from 'lucide-react';
import type { Event, GeocodingResult, Location, PublicProfile } from '@openpeeps/common/types';
import { Input, Label } from '@openpeeps/react-ui';
import { useOpenpeeps } from '../../../contexts/openpeeps';
import { useT } from '../../../i18n';
import { useServerInfo } from '../../server-data';
import { useCurrentProfile } from '../../layout/IdentityContext';
import { ProfileCard } from '../../profile';

export type EventFormat = 'jam' | 'external' | 'in-person';

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
  const { openpeepsApi } = useOpenpeeps();
  const [text, setText] = useState(value?.text ?? '');
  const [suggestions, setSuggestions] = useState<GeocodingResult[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setText(value?.text ?? '');
  }, [value?.text]);

  const search = (query: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setSuggestions([]);
      return;
    }
    debounceRef.current = setTimeout(() => {
      void openpeepsApi
        .useGeocode(query.trim())
        .then((result) => {
          const items = Array.isArray(result)
            ? result
            : ((result as { data?: GeocodingResult[] }).data ?? []);
          setSuggestions(items);
        })
        .catch(() => setSuggestions([]));
    }, 500);
  };

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
        <div className="bg-card absolute z-10 mt-1 max-h-40 w-full overflow-y-auto rounded-md border shadow-md">
          {suggestions.map((item) => (
            <button
              key={`${item.name}-${item.center.lat}-${item.center.lng}`}
              type="button"
              className="hover:bg-surface-100 w-full px-3 py-2 text-left text-sm"
              onClick={() => {
                setText(item.name);
                onChange({
                  text: item.name,
                  coordinates: item.center,
                });
                setSuggestions([]);
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
  const me = useCurrentProfile();
  const serverInfo = useServerInfo();
  const { openpeepsApi } = useOpenpeeps();
  const profilesQuery = openpeepsApi.useProfiles();

  const initialFormat: EventFormat = event.jam
    ? 'jam'
    : event.physicalLocation
      ? 'in-person'
      : 'external';

  const [eventFormat, setEventFormat] = useState<EventFormat>(initialFormat);

  const formats = useMemo(() => {
    const items: Array<{ value: EventFormat; label: string }> = [];
    if (serverInfo.jams.livekit.enabled) {
      items.push({
        value: 'jam',
        label: t('events.form.jamFormatLabel', { defaultValue: 'Jam session' }),
      });
    }
    items.push(
      {
        value: 'external',
        label: t('events.form.externalFormatLabel', {
          defaultValue: 'External link',
        }),
      },
      {
        value: 'in-person',
        label: t('events.form.inPersonFormatLabel', {
          defaultValue: 'In person',
        }),
      },
    );
    return items;
  }, [serverInfo.jams.livekit.enabled, t]);

  const switchFormat = (value: EventFormat) => {
    if (eventFormat === value) return;
    setEventFormat(value);
    const origin =
      typeof window !== 'undefined' ? window.location.origin : '';
    if (value === 'jam') {
      onChange({
        ...event,
        jam: {
          type: 'video-call',
          moderators: me?.id ? [me.id] : [],
          videoEnabled: true,
          speakers: [],
          presenters: [],
          waitingRoom: event.jam?.waitingRoom ?? false,
        },
        physicalLocation: undefined,
        url: origin,
      });
    } else if (value === 'external') {
      onChange({
        ...event,
        jam: undefined,
        physicalLocation: undefined,
        url: event.url ?? '',
      });
    } else {
      onChange({
        ...event,
        jam: undefined,
        physicalLocation: event.physicalLocation ?? { text: '' },
        url: undefined,
      });
    }
  };

  const moderatorProfiles = useMemo(() => {
    const ids = event.jam?.moderators ?? [];
    const all = profilesQuery.data ?? [];
    return ids
      .map((id) => all.find((p) => p.id === id))
      .filter((p): p is PublicProfile => Boolean(p));
  }, [event.jam?.moderators, profilesQuery.data]);

  const toggleModerator = (profile: PublicProfile) => {
    if (!event.jam) return;
    const ids = event.jam.moderators ?? [];
    const next = ids.includes(profile.id)
      ? ids.filter((id) => id !== profile.id)
      : [...ids, profile.id];
    onChange({
      ...event,
      jam: { ...event.jam, moderators: next },
    });
  };

  useEffect(() => {
    if (
      !isEdit &&
      eventFormat === 'jam' &&
      event.jam &&
      event.jam.moderators.length === 0 &&
      me?.id
    ) {
      onChange({
        ...event,
        jam: { ...event.jam, moderators: [me.id] },
      });
    }
  }, [isEdit, eventFormat, me?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-3">
      <Label title={t('events.form.eventFormat', { defaultValue: 'Event format' })}>
        <div className="mt-2 flex flex-col gap-2">
          {formats.map((format) => (
            <label key={format.value} className="flex w-fit items-center gap-2">
              <input
                type="radio"
                name="eventFormat"
                checked={eventFormat === format.value}
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
          onChange={(physicalLocation) =>
            onChange({ ...event, physicalLocation })
          }
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
              onChange={(e) => onChange({ ...event, url: e.target.value })}
            />
          </div>
        </div>
      ) : null}

      {eventFormat === 'jam' && serverInfo.jams.livekit.enabled ? (
        <>
          <div className="space-y-2">
            <Label>
              {t('events.form.jamModerators', {
                defaultValue: 'Jam moderators',
              })}
            </Label>
            {(profilesQuery.data ?? [])
              .filter((p) => p.id !== me?.id)
              .slice(0, 12)
              .map((profile) => {
                const selected = moderatorProfiles.some(
                  (p) => p.id === profile.id,
                );
                return (
                  <button
                    key={profile.id}
                    type="button"
                    className={`w-full rounded-md text-left ${selected ? 'bg-primary/10' : ''}`}
                    onClick={() => toggleModerator(profile)}
                  >
                    <ProfileCard profile={profile} />
                  </button>
                );
              })}
          </div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={event.jam?.waitingRoom ?? false}
              onChange={(e) =>
                event.jam &&
                onChange({
                  ...event,
                  jam: { ...event.jam, waitingRoom: e.target.checked },
                })
              }
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
