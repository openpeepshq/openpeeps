import React, { forwardRef } from 'react';
import { View } from 'react-native';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { ThemedText } from '../../../ui/themed-text';
import { BaseSheet } from '../common';
import { useTranslation } from 'react-i18next';
import { useOpenpeeps } from '@openpeeps/react';
import { ThreadPost } from '../../post';

interface ReplySheetProps {
  onSelect: (option: string) => void;
  id: string;
}

export const ReplySheet = forwardRef<BottomSheetModal, ReplySheetProps>(
  ({ id }, ref) => {
    const { t } = useTranslation();


    const { openpeepsApi } = useOpenpeeps();
    const { data: post } = openpeepsApi.usePost(id);
    return (
      <BaseSheet ref={ref} enableOverDrag={false}>
        <View className="flex-1 px-4 pt-2 pb-8">
          <ThemedText className="text-center text-xl tracking-wider font-semibold">
            {t('posts.replies.title')}
          </ThemedText>
          {post && <ThreadPost
            post={post}
            isParent={true}
            isChild={false}
            noActions={true}
            noMenu={true}
          />}
        </View>
      </BaseSheet>
    );
  },
);
