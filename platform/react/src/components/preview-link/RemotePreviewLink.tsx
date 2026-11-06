import { useState } from 'react';
import { Play } from 'lucide-react';
import { videoEmbedForUrl } from '@openpeepshq/common/lib';
import { LoadingSpinner } from '@openpeepshq/react-ui';
import { useT } from '../../i18n';
import { useOpenpeeps } from '../../contexts/openpeeps';
import { recordOutboundClick } from '../../lib/analyticsClicks';

export interface RemotePreviewLinkProps {
  url: string;
}

// Same safety set as the markdown iframe path (see
// injectIframeSafetyAttrs in @openpeepshq/common/lib); `allow` is trimmed
// to what video players need.
const EMBED_SANDBOX =
  'allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-presentation';
const EMBED_ALLOW = 'autoplay; encrypted-media; picture-in-picture; fullscreen';

export function RemotePreviewLink({ url }: RemotePreviewLinkProps) {
  const t = useT();
  const { openpeepsApi } = useOpenpeeps();
  const embed = videoEmbedForUrl(url);
  // Click-to-load: the server-fetched OG card (no third-party request) is
  // the default view; the player mounts only after an explicit action.
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null);
  const previewQuery = openpeepsApi.usePreviewLink(url);

  if (embed && loadedUrl === url) {
    return (
      <div className="mb-2 w-full">
        <iframe
          src={embed.embedUrl}
          title={t('previewLink.embeddedVideo', {
            defaultValue: 'Embedded video',
          })}
          className="aspect-video w-full rounded-md border-0"
          sandbox={EMBED_SANDBOX}
          allow={EMBED_ALLOW}
          allowFullScreen
          referrerPolicy="no-referrer"
        />
      </div>
    );
  }

  if (previewQuery.isLoading) {
    return (
      <div className="text-muted-foreground py-2 text-sm">
        <LoadingSpinner />
      </div>
    );
  }

  const data = previewQuery.data?.data;
  if (!data) return null;

  let hostname = url;
  try {
    hostname = new URL(url).hostname;
  } catch {
    /* keep url */
  }

  const card = (
    <div className="flex w-full min-w-0 flex-row items-center gap-4 p-2">
      {data.image || embed ? (
        <div className="relative flex h-24 w-24 shrink-0 items-center justify-center">
          {data.image ? (
            <img
              src={data.image}
              alt={data.title ?? ''}
              className="h-full w-full rounded-md object-cover"
            />
          ) : null}
          {embed ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex size-10 items-center justify-center rounded-full bg-black/60">
                <Play className="size-5 text-white" aria-hidden />
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="text-muted-foreground truncate text-xs">{hostname}</p>
        {data.title ? (
          <p className="truncate font-semibold">{data.title}</p>
        ) : null}
        {data.description ? (
          <p className="text-muted-foreground truncate text-sm">
            {data.description}
          </p>
        ) : null}
      </div>
    </div>
  );

  if (!embed) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="hover:bg-surface mb-2 block w-full min-w-0 max-w-full overflow-hidden rounded-md border no-underline"
        onClick={(e) => {
          e.stopPropagation();
          recordOutboundClick(url);
        }}
      >
        {card}
      </a>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={t('previewLink.playVideo', { defaultValue: 'Play video' })}
      className="hover:bg-surface mb-2 block w-full min-w-0 max-w-full cursor-pointer overflow-hidden rounded-md border"
      onClick={() => setLoadedUrl(url)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setLoadedUrl(url);
        }
      }}
    >
      {card}
    </div>
  );
}
