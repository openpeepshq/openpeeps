import React, { useMemo } from 'react';
import { isLocalLink, isValidUrl } from './helpers';
import { LocalPreviewLink } from './LocalPreviewLink';
import { RemotePreviewLink } from './RemotePreviewLink';
import { BASE_URL } from '~/lib/constants';

interface PreviewLinkProps {
  url?: string;
}

export const PreviewLink = ({ url = '' }: PreviewLinkProps) => {
  const isValid = useMemo(() => url && isValidUrl(url), [url]);
  const isLocal = useMemo(
    () => isValid && isLocalLink(url, BASE_URL as string),
    [isValid, url],
  );

  if (!isValid) {
    return null;
  }

  return isLocal ? (
    <LocalPreviewLink url={url} />
  ) : (
    <RemotePreviewLink url={url} />
  );
};

