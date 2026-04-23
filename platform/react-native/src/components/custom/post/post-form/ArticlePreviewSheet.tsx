import React, {forwardRef} from 'react';
import {BaseSheet} from '../../modals';
import {BottomSheetModal} from '@gorhom/bottom-sheet';
import {ScrollView, View} from 'react-native';
import {OpenPeepsMarkdown} from '../../markdown';

interface DocumentPickerSheetProps {
  content: string;
}

const ArticlePreviewSheet = forwardRef<
  BottomSheetModal,
  DocumentPickerSheetProps
>(({content}, ref) => {
  return (
    <BaseSheet ref={ref} scrollable>
      <View className="p-6">
        <OpenPeepsMarkdown source={content || ''} linkPreviewMode="none" />
      </View>
    </BaseSheet>
  );
});

export default ArticlePreviewSheet;
