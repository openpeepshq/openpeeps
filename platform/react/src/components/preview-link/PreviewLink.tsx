import { isLocalLink, isValidUrl } from './helpers';
import { LocalPreviewLink } from './LocalPreviewLink';
import { RemotePreviewLink } from './RemotePreviewLink';

export interface PreviewLinkProps {
  url?: string;
}

export function PreviewLink({ url = '' }: PreviewLinkProps) {
  if (!isValidUrl(url)) return null;

  const origin =
    typeof window !== 'undefined' ? window.location.origin : '';
  const local = isLocalLink(url, origin);

  return (
    <div className="min-w-0 max-w-full overflow-hidden">
      {local ? (
        <LocalPreviewLink url={url} />
      ) : (
        <RemotePreviewLink url={url} />
      )}
    </div>
  );
}
