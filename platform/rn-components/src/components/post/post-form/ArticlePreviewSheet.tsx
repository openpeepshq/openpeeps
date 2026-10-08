import React, { forwardRef } from 'react';
import { BaseSheet } from '../../custom/modals';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { View } from 'react-native';
import { OpenpeepsMarkdown } from '../../markdown';

interface DocumentPickerSheetProps {
  content: string;
}

const ArticlePreviewSheet = forwardRef<
  BottomSheetModal,
  DocumentPickerSheetProps
>(({ content }, ref) => {
  return (
    <BaseSheet ref={ref} scrollable>
      <View className="p-6">
        <OpenpeepsMarkdown source={content || ''} linkPreviewMode="none" />
      </View>
    </BaseSheet>
  );
});

export default ArticlePreviewSheet;
