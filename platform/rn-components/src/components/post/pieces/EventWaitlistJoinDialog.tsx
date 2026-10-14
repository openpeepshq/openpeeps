import React, { forwardRef } from 'react';
import { View } from 'react-native';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useTranslation } from 'react-i18next';
import type { PublicPost } from '@openpeepshq/common/types';
import { waitlistOfferWindowMs } from '@openpeepshq/common/lib';
import { BaseSheet, SheetFooter } from '../../custom/modals/common';
import { ThemedText } from '../../ui/themed-text';
import { bottomSheetClose } from '../../../lib/bottom-sheet-ref';

export interface EventWaitlistJoinDialogProps {
  post: PublicPost;
  error?: string | null;
  isLoading?: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
}

export const EventWaitlistJoinDialog = forwardRef<
  BottomSheetModal,
  EventWaitlistJoinDialogProps
>(({ post, error, isLoading, onClose, onConfirm }, ref) => {
  const { t } = useTranslation();
  const event = post.data?.type === 'event' ? post.data : undefined;
  const minutes = event
    ? Math.round(waitlistOfferWindowMs(event) / 60_000)
    : 60;

  return (
    <BaseSheet ref={ref} snapPoints={['40%']} onDismiss={onClose}>
      <View className="flex-1 gap-y-3 p-4">
        <ThemedText className="text-center text-lg">
          {t('events.rsvp.waitlistConfirmTitle')}
        </ThemedText>
        <ThemedText className="text-center text-sm">
          {t('events.rsvp.atCapacity')}
        </ThemedText>
        <ThemedText className="text-center text-sm text-muted-foreground">
          {t('events.rsvp.waitlistConfirmBody', { minutes })}
        </ThemedText>
        {error ? (
          <ThemedText className="text-center text-sm text-destructive">
            {error}
          </ThemedText>
        ) : null}
        <SheetFooter
          onCancel={() => {
            bottomSheetClose(ref);
            onClose();
          }}
          onConfirm={onConfirm}
          confirmText={t('events.rsvp.joinWaitlist')}
          cancelText={t('events.rsvp.scope.cancel')}
          disabled={isLoading}
          isLoading={isLoading}
        />
      </View>
    </BaseSheet>
  );
});

EventWaitlistJoinDialog.displayName = 'EventWaitlistJoinDialog';
