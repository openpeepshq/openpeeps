import { useOpenpeeps } from '../../contexts/openpeeps';
import { useT } from '../../i18n';

export interface RemotePreviewLinkProps {
  url: string;
}

export function RemotePreviewLink({ url }: RemotePreviewLinkProps) {
  const t = useT();
  const { openpeepsApi } = useOpenpeeps();
  const previewQuery = openpeepsApi.usePreviewLink(url);

  if (previewQuery.isLoading) {
    return (
      <div className="text-muted-foreground py-2 text-sm">
        {t('common.loading', { defaultValue: 'Loading…' })}
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
      className="hover:bg-surface-100 mb-2 block rounded-md border no-underline"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex w-full flex-row items-center gap-4 p-2">
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
          <p className="text-muted-foreground text-xs">{hostname}</p>
          {data.title ? <p className="font-semibold">{data.title}</p> : null}
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
