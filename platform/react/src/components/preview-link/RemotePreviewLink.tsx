import { videoEmbedForUrl } from '@openpeepshq/common/lib';
import { LoadingSpinner } from '@openpeepshq/react-ui';
import { useT } from '../../i18n';
import { useOpenpeeps } from '../../contexts/openpeeps';
import { recordOutboundClick } from '../../lib/analyticsClicks';

export interface RemotePreviewLinkProps {
  url: string;
}

export function RemotePreviewLink({ url }: RemotePreviewLinkProps) {
  const t = useT();
  const { openpeepsApi } = useOpenpeeps();
  const embed = videoEmbedForUrl(url);
  const previewQuery = openpeepsApi.usePreviewLink(url, {
    enabled: !embed,
  });

  if (embed) {
    return (
      <div className="mb-2 w-full">
        <iframe
          src={embed.embedUrl}
          title={t('previewLink.embeddedVideo', {
            defaultValue: 'Embedded video',
          })}
          className="aspect-video w-full rounded-md border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          loading="lazy"
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
      <div className="flex w-full min-w-0 flex-row items-center gap-4 p-2">
        {data.image ? (
          <div className="flex h-24 w-24 shrink-0 items-center justify-center">
            <img
              src={data.image}
              alt={data.title ?? ''}
              className="h-full w-full rounded-md object-cover"
            />
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
    </a>
  );
}
