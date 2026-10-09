import React, { forwardRef, useEffect, useMemo, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import {
  BottomSheetModal,
  BottomSheetView,
  BottomSheetScrollView,
  type BottomSheetModalProps,
} from '@gorhom/bottom-sheet';
import { SheetBackdrop } from './sheet-backdrop';
import { useWindowSize } from '../../../../hooks/index';
import { useOpenPeepsTheme } from '../../../../theme/OpenPeepsThemeProvider';
import { getThemeVars } from '../../../../theme/utils';

interface BaseSheetProps {
  children: React.ReactNode;
  snapPoints?: string[];
  enablePanDownToClose?: boolean;
  enableOverDrag?: boolean;
  index?: number;
  scrollable?: boolean;
  onDismiss?: () => void;
  stackBehavior?: BottomSheetModalProps['stackBehavior'];
}

export const BaseSheet = forwardRef<BottomSheetModal, BaseSheetProps>(
  (
    {
      children,
      snapPoints = ['100%'],
      enablePanDownToClose = true,
      enableOverDrag = false,
      index = 0,
      scrollable = false,
      onDismiss,
      stackBehavior,
    },
    ref
  ) => {
    const [keyboardVisible, setKeyboardVisible] = useState(false);

    const { colors } = useOpenPeepsTheme();
    const themeVars = useMemo(() => getThemeVars(colors), [colors]);
    const ContentComponent = scrollable
      ? BottomSheetScrollView
      : BottomSheetView;

    const { windowWidth, isMediumScreenOrLarger } = useWindowSize();
    const margin = (windowWidth - 512) / 7;

    useEffect(() => {
      const showSub = Keyboard.addListener('keyboardDidShow', () =>
        setKeyboardVisible(true)
      );
      const hideSub = Keyboard.addListener('keyboardDidHide', () =>
        setKeyboardVisible(false)
      );

      return () => {
        showSub.remove();
        hideSub.remove();
      };
    }, []);

    return (
      <BottomSheetModal
        containerStyle={
          isMediumScreenOrLarger
            ? [styles.wideContainer, { marginHorizontal: margin }]
            : undefined
        }
        ref={ref}
        index={index}
        snapPoints={snapPoints}
        enablePanDownToClose={enablePanDownToClose}
        enableOverDrag={enableOverDrag}
        backdropComponent={SheetBackdrop}
        onDismiss={onDismiss}
        stackBehavior={stackBehavior}
        backgroundStyle={{
          backgroundColor: colors.background,
        }}
      >
        <ContentComponent style={[styles.content, themeVars]}>
          <KeyboardAvoidingView
            className={keyboardVisible ? 'h-[70vh] flex-1' : 'flex-1'}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            {children}
          </KeyboardAvoidingView>
        </ContentComponent>
      </BottomSheetModal>
    );
  }
);

const styles = StyleSheet.create({
  wideContainer: { width: 'auto' },
  content: { flex: 1 },
});
