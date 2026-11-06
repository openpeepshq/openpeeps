import { useEffect, useMemo, useRef, useState } from 'react';
import type {
  Event,
  GeocodingResult,
  Location,
  PublicProfile,
  VisibilityType,
} from '@openpeepshq/common/types';
import { useOpenpeeps } from '../../contexts/openpeeps';
import { useT } from '../../i18n/context';
import { useServerInfo } from '../../components/server-data/context';
import { useCurrentProfile } from '../../components/layout/IdentityContext';

export type EventFormat = 'jam' | 'external' | 'in-person';

export type UseEventTypeSwitcherArgs = {
  event: Event;
  isEdit?: boolean;
  onChange: (event: Event) => void;
  /** Public origin the jam link is built from (web: `window.location.origin`). */
  origin: string;
  /** Post visibility; scopes the co-organizer picker (group members, direct audience, or all local profiles). */
  visibility?: VisibilityType;
  groupId?: string | null;
  audience?: PublicProfile[] | null;
  /** The event author; on edit, only they may manage co-organizers (create = me). */
  authorId?: string;
};

export const useEventTypeSwitcher = ({
  event,
  isEdit = false,
  onChange,
  origin,
  visibility,
  groupId,
  audience,
  authorId,
}: UseEventTypeSwitcherArgs) => {
  const t = useT();
  const me = useCurrentProfile();
  const serverInfo = useServerInfo();
  const { openpeepsApi } = useOpenpeeps();
  const profilesQuery = openpeepsApi.useProfiles();
  const livekitEnabled = serverInfo.jams.livekit.enabled;
  const showJamFormat = livekitEnabled || (isEdit && !!event.jam);

  const initialFormat: EventFormat =
    event.jam && showJamFormat
      ? 'jam'
      : event.physicalLocation
        ? 'in-person'
        : 'external';

  const [eventFormat, setEventFormat] = useState<EventFormat>(initialFormat);

  const formats = useMemo(() => {
    const items: Array<{ value: EventFormat; label: string }> = [];
    if (showJamFormat) {
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
  }, [showJamFormat, t]);

  const switchFormat = (value: EventFormat) => {
    if (eventFormat === value) return;
    if (value === 'jam' && !livekitEnabled) return;
    setEventFormat(value);
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

  const setModerators = (profiles: PublicProfile[]) => {
    if (!event.jam) return;
    onChange({
      ...event,
      jam: { ...event.jam, moderators: profiles.map((p) => p.id) },
    });
  };

  const coOrganizerProfiles = useMemo(() => {
    const ids = event.coOrganizers ?? [];
    const all = profilesQuery.data ?? [];
    return ids
      .map((id) => all.find((p) => p.id === id))
      .filter((p): p is PublicProfile => Boolean(p));
  }, [event.coOrganizers, profilesQuery.data]);

  const setCoOrganizers = (profiles: PublicProfile[]) => {
    onChange({
      ...event,
      coOrganizers: profiles.length > 0 ? profiles.map((p) => p.id) : undefined,
    });
  };

  const groupMembersQuery = openpeepsApi.useGroupMembers(
    visibility === 'group' ? (groupId ?? '') : '',
  );

  /**
   * Profiles the author may pick as co-organizers: those who can read the
   * post (group members, the direct audience, or any local profile for
   * public/local events), minus the author.
   */
  const coOrganizerCandidates = useMemo(() => {
    const source =
      visibility === 'group'
        ? (groupMembersQuery.data ?? []).map((member) => member.profile)
        : visibility === 'direct'
          ? (audience ?? [])
          : (profilesQuery.data ?? []);
    return source.filter(
      (profile) => profile.type === 'local' && profile.id !== me?.id,
    );
  }, [
    visibility,
    groupMembersQuery.data,
    audience,
    profilesQuery.data,
    me?.id,
  ]);

  const canManageCoOrganizers =
    !isEdit || (me?.id !== undefined && me.id === authorId);

  const setWaitingRoom = (waitingRoom: boolean) => {
    if (!event.jam) return;
    onChange({ ...event, jam: { ...event.jam, waitingRoom } });
  };

  const setUrl = (url: string) => onChange({ ...event, url });

  const setPhysicalLocation = (physicalLocation: Location | undefined) =>
    onChange({ ...event, physicalLocation });

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

  return {
    eventFormat,
    formats,
    livekitEnabled,
    switchFormat,
    moderatorProfiles,
    setModerators,
    coOrganizerProfiles,
    setCoOrganizers,
    coOrganizerCandidates,
    canManageCoOrganizers,
    setWaitingRoom,
    setUrl,
    setPhysicalLocation,
  };
};

/** Debounced place search backing the in-person location input. */
export const useLocationSearch = (value: Location | undefined) => {
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

  return {
    text,
    setText,
    suggestions,
    clearSuggestions: () => setSuggestions([]),
    search,
  };
};
