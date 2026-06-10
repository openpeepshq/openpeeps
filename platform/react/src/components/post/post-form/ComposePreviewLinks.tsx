import { extractUrlsFromText } from '../../preview-link/helpers';
import { PreviewLink } from '../../preview-link/PreviewLink';

export interface ComposePreviewLinksProps {
  content?: string;
}

export function ComposePreviewLinks({ content }: ComposePreviewLinksProps) {
  const urls = extractUrlsFromText(content);
  if (urls.length === 0) return null;

  return (
    <div className="my-2 min-w-0 space-y-2">
      {urls.map((url) => (
        <PreviewLink key={url} url={url.replace(/[),.]+$/, '')} />
      ))}
    </div>
  );
}
