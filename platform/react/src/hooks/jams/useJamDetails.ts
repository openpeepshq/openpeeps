import { useState } from 'react';
import { canModerateJam } from '@openpeepshq/common/lib';
import { useOpenpeeps } from '../../contexts/openpeeps';
import { useT } from '../../i18n';
import { useCurrentProfile } from '../../components/layout/IdentityContext';
import { useJamContext } from '../../components/jams/JamContext';
import { useJamRtmpStreamState } from '../../components/jams/jamRecordingState';

/** Details drawer data: moderator flag and the observer link path. */
export const useJamDetails = () => {
  const me = useCurrentProfile();
  const { jamPost, occurrence } = useJamContext();
  const { openpeepsApi } = useOpenpeeps();
  const observerLinkQuery = openpeepsApi.useObserverLink(
    jamPost.id,
    occurrence,
  );

  return {
    jamPost,
    isModerator: canModerateJam(me, jamPost),
    observerPath: observerLinkQuery.data?.path,
  };
};

export type UseJamRtmpStreamArgs = {
  jamId: string;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
};

/** Moderator RTMP restream form state (start/stop + credentials). */
export const useJamRtmpStream = ({
  jamId,
  onSuccess,
  onError,
}: UseJamRtmpStreamArgs) => {
  const t = useT();
  const { openpeepsApi } = useOpenpeeps();
  const { isStreaming } = useJamRtmpStreamState();
  const streamQuery = openpeepsApi.useRtmpStream(jamId);
  const startStream = openpeepsApi.startRtmpStreamAction({ id: jamId });
  const stopStream = openpeepsApi.stopRtmpStreamAction({ id: jamId });

  const [url, setUrl] = useState('');
  const [streamKey, setStreamKey] = useState('');
  const [busy, setBusy] = useState(false);

  const live =
    isStreaming ||
    (streamQuery.isSuccess && streamQuery.data?.status === 'active');
  const host = streamQuery.data?.destinationHost;

  const onStart = async () => {
    setBusy(true);
    try {
      await startStream({ url, streamKey });
      setStreamKey('');
      onSuccess(t('jams.details.rtmpStarted'));
      await streamQuery.refetch();
    } catch {
      onError(t('jams.details.rtmpStartError'));
    } finally {
      setBusy(false);
    }
  };

  const onStop = async () => {
    setBusy(true);
    try {
      await stopStream();
      onSuccess(t('jams.details.rtmpStopped'));
      await streamQuery.refetch();
    } catch {
      onError(t('jams.details.rtmpStopError'));
    } finally {
      setBusy(false);
    }
  };

  return {
    live,
    host,
    url,
    setUrl,
    streamKey,
    setStreamKey,
    busy,
    canSubmit: !busy && (live || (!!url.trim() && !!streamKey.trim())),
    toggle: () => void (live ? onStop() : onStart()),
  };
};
