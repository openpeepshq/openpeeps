import { Link, MapPin } from 'lucide-react';
import type { Event, Location } from '@openpeepshq/common/types';
import {
  canAnnouncePosts,
  isCommunityWideVisibility,
} from '@openpeepshq/common/lib';
import { Input, Label } from '@openpeepshq/react-ui';
import { useT } from '../../../i18n';
import {
  useEventTypeSwitcher,
  useLocationSearch,
} from '../../../hooks/events/useEventTypeSwitcher';
import { useAuthData } from '../../layout/IdentityContext';
import { ProfilesInput } from '../../profile';

export type { EventFormat } from '../../../hooks/events/useEventTypeSwitcher';

export interface EventTypeSwitcherProps {
  event: Event;
  isEdit?: boolean;
  onChange: (event: Event) => void;
  /** Post visibility; gates the community-wide "notify everyone" opt-in. */
  visibility?: string;
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
  visibility,
}: EventTypeSwitcherProps) {
  const t = useT();
  const authData = useAuthData();
  const canNotify =
    canAnnouncePosts(authData.profile?.roles) &&
    isCommunityWideVisibility(visibility);
  const {
    eventFormat,
    formats,
    livekitEnabled,
    switchFormat,
    moderatorProfiles,
    setModerators,
    coOrganizerProfiles,
    setCoOrganizers,
    setWaitingRoom,
    setNotifyEveryone,
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

      <div className="space-y-2">
        <Label>
          {t('events.form.coOrganizers', { defaultValue: 'Co-organizers' })}
        </Label>
        <ProfilesInput
          value={coOrganizerProfiles}
          onChange={setCoOrganizers}
          // The server skips the caller when validating the list; mirror it
          // in the picker (pattern: groups/New.tsx).
          banlist={authData.profile ? [authData.profile] : []}
          // Deliberate: the list is NOT pre-filtered per event visibility
          // (the jam-moderator picker behaves the same). For group events the
          // server rejects a non-member with 422 eventCoOrganizerInvisible;
          // pinned in platform/core eventCollaborators.test.ts.
          filter={(profile) => profile.type !== 'federated'}
          placeholder={t('events.form.coOrganizersDescription', {
            defaultValue:
              'Click to select co-organizers who can edit this event and manage RSVPs',
          })}
        />
      </div>

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
          {canNotify ? (
            <label className="flex items-start gap-2">
              <input
                type="checkbox"
                className="mt-1"
                checked={event.jam?.notifyEveryone ?? false}
                disabled={!livekitEnabled}
                onChange={(e) => setNotifyEveryone(e.target.checked)}
              />
              <span className="flex flex-col">
                <span className="text-sm">
                  {t('events.form.jamNotifyEveryone', {
                    defaultValue: 'Notify everyone when the jam starts',
                  })}
                </span>
                <span className="text-muted-foreground text-xs">
                  {t('events.form.jamNotifyEveryoneDescription', {
                    defaultValue:
                      'Every member of the community gets a notification when the jam starts.',
                  })}
                </span>
              </span>
            </label>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
