import { resolveFeedFormat, type FeedFormat } from '@openpeepshq/common';
import { useOpenpeeps } from '../contexts/openpeeps';
import { useFeedFormatSession } from '../stores/feedFormat';

export const useResolvedFeedFormat = (): {
  format: FeedFormat;
  persisted: FeedFormat;
  setSessionFormat: (format: FeedFormat) => void;
  clearSessionFormat: () => void;
} => {
  const { session, setSessionFormat, clearSessionFormat } =
    useFeedFormatSession();
  const { openpeepsApi } = useOpenpeeps();
  const serverInfo = openpeepsApi.useServerInfo();
  const settingsQuery = openpeepsApi.useCurrentProfileSettings();
  const persisted = resolveFeedFormat(
    settingsQuery.data?.feedSettings?.format,
    serverInfo.data?.communityConfig?.settings?.defaultFeedFormat,
  );
  return {
    format: session ?? persisted,
    persisted,
    setSessionFormat,
    clearSessionFormat,
  };
};

export const useFeedListParams = (extra?: {
  start?: string;
  limit?: number;
  format?: FeedFormat;
}) => {
  const { format } = useResolvedFeedFormat();
  return { ...extra, format: extra?.format ?? format };
};
