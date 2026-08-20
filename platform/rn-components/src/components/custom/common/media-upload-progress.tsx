import React, { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { Progress } from '~/components/ui/progress';
import { ThemedText } from '~/components/ui/themed-text';
import { useOpenpeeps } from '@openpeepshq/react';
import type { MediaAttachment } from '@openpeepshq/common';

interface Props {
  /**
   * Byte-level upload percent (0-100). When `isUploading` is true, this drives
   * the progress bar. When the server returns the partial attachment, switch
   * `isUploading` to false and pass `mediaAttachmentId` so we can listen for
   * the processing-phase ETA.
   */
  uploadPercent?: number;
  /** Linear ETA for the byte-transfer phase, in ms. */
  uploadEstimatedRemainingMs?: number;
  isUploading?: boolean;
  mediaAttachmentId?: string;
  onReady?: (attachment: MediaAttachment) => void;
  onFailed?: (error?: string) => void;
}

export const MediaUploadProgress: React.FC<Props> = ({
  uploadPercent = 0,
  uploadEstimatedRemainingMs,
  isUploading = false,
  mediaAttachmentId,
  onReady,
  onFailed,
}) => {
  const { openpeepsApi } = useOpenpeeps();
  const event = openpeepsApi.useMediaProgress(mediaAttachmentId);
  const [reportedReady, setReportedReady] = useState<string | undefined>();
  const [reportedFailed, setReportedFailed] = useState<string | undefined>();

  const processingPercent = Math.min(
    95,
    Math.max(0, event?.progressPercent ?? 0),
  );
  const status: 'processing' | 'ready' | 'failed' | 'idle' =
    event?.mediaAttachment?.status ?? 'idle';

  useEffect(() => {
    if (!mediaAttachmentId || !event) return;
    if (status === 'ready' && reportedReady !== mediaAttachmentId) {
      setReportedReady(mediaAttachmentId);
      onReady?.(event.mediaAttachment);
    } else if (status === 'failed' && reportedFailed !== mediaAttachmentId) {
      setReportedFailed(mediaAttachmentId);
      onFailed?.(event.mediaAttachment?.error);
    }
  }, [
    status,
    mediaAttachmentId,
    event,
    onReady,
    onFailed,
    reportedReady,
    reportedFailed,
  ]);

  const displayPercent = useMemo(() => {
    // Upload phase shows real bytes-transferred percent (0-100). Processing
    // phase shows ETA-based percent capped server-side at 95% until the
    // worker finishes.
    if (isUploading) return Math.max(0, Math.min(100, uploadPercent));
    if (status === 'ready') return 100;
    if (status === 'failed') return 0;
    return processingPercent;
  }, [isUploading, uploadPercent, processingPercent, status]);

  const label = useMemo(() => {
    if (isUploading) return 'Uploading';
    if (status === 'ready') return 'Ready';
    if (status === 'failed') return 'Failed';
    if (status === 'processing') return 'Processing';
    return '';
  }, [isUploading, status]);

  if (!isUploading && !mediaAttachmentId) return null;

  return (
    <View className="flex-col gap-1 w-full">
      <View className="flex-row justify-between">
        <ThemedText className="text-xs">{label}</ThemedText>
        <ThemedText className="text-xs">
          {Math.round(displayPercent)}%
        </ThemedText>
      </View>
      <Progress value={displayPercent} />
      {isUploading &&
        uploadEstimatedRemainingMs !== undefined &&
        uploadEstimatedRemainingMs > 1000 && (
          <ThemedText className="text-xs opacity-70">
            {`~${Math.ceil(uploadEstimatedRemainingMs / 1000)}s remaining`}
          </ThemedText>
        )}
      {!isUploading &&
        status === 'processing' &&
        event?.estimatedRemainingMs !== undefined &&
        event.estimatedRemainingMs > 1000 && (
          <ThemedText className="text-xs opacity-70">
            {`~${Math.ceil(event.estimatedRemainingMs / 1000)}s remaining`}
          </ThemedText>
        )}
    </View>
  );
};
