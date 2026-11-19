import { useEffect, useReducer } from 'react';
import { RoomEvent, Track, type Room } from 'livekit-client';

/**
 * Re-renders the caller each time a remote video track is (un)subscribed, so
 * tiles re-read the mutated `publication.track` and the #1903 track-epoch
 * remount re-attaches the stream to the native RTCView (#1808).
 *
 * `useTracks`'s `trackReferencesObservable` already re-emits for most
 * transitions (`TrackPublished/Unpublished`, `TrackMuted/Unmuted`,
 * `TrackSubscriptionStatusChanged`, participant connect/disconnect), which
 * covers a first mid-Jam camera publish and an off→on republish (the
 * placeholder→reference swap fires `TrackPublished`; the
 * Desired→Subscribed attach fires `TrackSubscriptionStatusChanged`). The one
 * swap it misses is a track object replaced under the *same* `trackSid` while
 * the subscription status stays `Subscribed` (publisher-side restart /
 * device switch): `RemoteTrackPublication.setTrack` emits
 * `TrackEvent.Subscribed`/`Unsubscribed` (room `TrackSubscribed` /
 * `TrackUnsubscribed`) in that case, but no status event. This bump is the
 * re-render that lets the tiles react to that gap.
 *
 * Audio tracks are ignored: neither `useTracks` call selects them, so no
 * derived tile output depends on their subscriptions. (Screen share needs no
 * bump either — it is video, so a screen-share `TrackSubscribed` is handled
 * by the same listener.) Ignoring audio also keeps a join from re-rendering
 * the whole conference.
 */
export const useTrackSubscriptionBump = (room: Room) => {
  const [, bump] = useReducer((count: number) => count + 1, 0);
  useEffect(() => {
    const onSubscriptionChanged = (track: Track) => {
      if (track.kind !== Track.Kind.Video) return;
      bump();
    };
    room
      .on(RoomEvent.TrackSubscribed, onSubscriptionChanged)
      .on(RoomEvent.TrackUnsubscribed, onSubscriptionChanged);
    return () => {
      room
        .off(RoomEvent.TrackSubscribed, onSubscriptionChanged)
        .off(RoomEvent.TrackUnsubscribed, onSubscriptionChanged);
    };
  }, [room]);
};
