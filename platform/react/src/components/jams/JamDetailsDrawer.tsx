import { useState } from 'react';
import { Copy, CopyCheck, X } from 'lucide-react';
import { truncateText } from '@openpeepshq/common';
import { canModerateJam } from '@openpeepshq/common/lib';
import { useOpenpeeps } from '../../contexts/openpeeps';
import { useT } from '../../i18n';
import { useCurrentProfile } from '../layout/IdentityContext';
import { useToast } from '../layout/ToastProvider';
import { useJamContext } from './JamContext';
import { useJamRtmpStreamState } from './jamRecordingState';

export interface JamDetailsDrawerProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Jam details side menu (joining info + moderator observer link), styled like
 * the chat / people drawers. Replaces the previous floating info popover.
 */
export const JamDetailsDrawer = ({ open, onClose }: JamDetailsDrawerProps) => {
  const t = useT();
  const me = useCurrentProfile();
  const { jamPost, occurrence } = useJamContext();
  const { openpeepsApi } = useOpenpeeps();
  const observerLinkQuery = openpeepsApi.useObserverLink(
    jamPost.id,
    occurrence,
  );
  const isModerator = canModerateJam(me, jamPost);

  const [copied, setCopied] = useState(false);
  const [observerCopied, setObserverCopied] = useState(false);

  if (!open) return null;

  const href = typeof window !== 'undefined' ? window.location.href : '';
  const observerPath = observerLinkQuery.data?.path;
  const observerUrl =
    typeof window !== 'undefined' && observerPath
      ? observerPath.startsWith('http')
        ? observerPath
        : `${window.location.origin}${observerPath}`
      : null;

  return (
    <div className="bg-surface text-foreground absolute right-0 top-0 flex h-full w-full flex-col gap-3 overflow-hidden rounded md:relative md:w-80">
      <div className="flex w-full flex-none items-center justify-between border-b p-2">
        <h3 className="text-lg">{t('jams.details.panelHeading')}</h3>
        <button
          type="button"
          title={t('jams.details.closePanel')}
          className="text-neutral-400"
          onClick={onClose}
        >
          <X />
        </button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-2 pb-4">
        <div>
          <h4 className="text-muted-foreground text-xs font-semibold uppercase">
            {t('jams.details.joiningInfoHeading')}
          </h4>
          <span className="mt-1 block break-all text-sm">{href}</span>
          <button
            type="button"
            className="mt-2 flex items-center text-sm"
            onClick={() => {
              void navigator.clipboard.writeText(href);
              setCopied(true);
            }}
          >
            {copied ? (
              <CopyCheck className="size-4" />
            ) : (
              <Copy className="size-4" />
            )}
            <span className="ml-2">
              {copied
                ? t('jams.details.copiedJoiningInfo')
                : t('jams.details.copyJoiningInfo')}
            </span>
          </button>
        </div>

        {observerUrl ? (
          <div>
            <h4 className="text-muted-foreground text-xs font-semibold uppercase">
              {t('jams.details.observerLinkHeading')}
            </h4>
            <span className="mt-1 block break-all text-sm">
              {truncateText(observerUrl, 40)}
            </span>
            <button
              type="button"
              className="mt-2 flex items-center text-sm"
              onClick={() => {
                void navigator.clipboard.writeText(observerUrl);
                setObserverCopied(true);
              }}
            >
              {observerCopied ? (
                <CopyCheck className="size-4" />
              ) : (
                <Copy className="size-4" />
              )}
              <span className="ml-2">
                {observerCopied
                  ? t('jams.details.copiedObserverLink')
                  : t('jams.details.copyObserverLink')}
              </span>
            </button>
          </div>
        ) : null}

        {isModerator ? <JamRtmpStreamForm jamId={jamPost.id} /> : null}
      </div>
    </div>
  );
};

const JamRtmpStreamForm = ({ jamId }: { jamId: string }) => {
  const t = useT();
  const { openpeepsApi } = useOpenpeeps();
  const { success: toastSuccess, error: toastError } = useToast();
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
      toastSuccess(t('jams.details.rtmpStarted'));
      await streamQuery.refetch();
    } catch {
      toastError(t('jams.details.rtmpStartError'));
    } finally {
      setBusy(false);
    }
  };

  const onStop = async () => {
    setBusy(true);
    try {
      await stopStream();
      toastSuccess(t('jams.details.rtmpStopped'));
      await streamQuery.refetch();
    } catch {
      toastError(t('jams.details.rtmpStopError'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <h4 className="text-muted-foreground text-xs font-semibold uppercase">
        {t('jams.details.rtmpHeading')}
      </h4>
      <p className="text-muted-foreground mt-1 text-sm">
        {t('jams.details.rtmpHelp')}
      </p>
      {live ? (
        <p className="mt-2 text-sm">
          {t('jams.details.rtmpLive', { host: host || 'RTMP' })}
        </p>
      ) : (
        <div className="mt-2 space-y-2">
          <label className="block text-sm">
            {t('jams.details.rtmpUrlLabel')}
            <input
              type="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder={t('jams.details.rtmpUrlPlaceholder')}
              className="border-border bg-background mt-1 w-full rounded border px-2 py-1 text-sm"
              autoComplete="off"
            />
          </label>
          <label className="block text-sm">
            {t('jams.details.rtmpStreamKeyLabel')}
            <input
              type="password"
              value={streamKey}
              onChange={(event) => setStreamKey(event.target.value)}
              className="border-border bg-background mt-1 w-full rounded border px-2 py-1 text-sm"
              autoComplete="off"
            />
          </label>
        </div>
      )}
      <button
        type="button"
        className="mt-2 text-sm"
        disabled={busy || (!live && (!url.trim() || !streamKey.trim()))}
        onClick={() => {
          void (live ? onStop() : onStart());
        }}
      >
        {live ? t('jams.details.rtmpStop') : t('jams.details.rtmpStart')}
      </button>
    </div>
  );
};
