import React, { forwardRef, useEffect, useMemo, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform } from 'react-native';
import {
  BottomSheetModal,
  BottomSheetView,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import { SheetBackdrop } from './sheet-backdrop';
import { useWindowSize } from '~/hooks';
import { useOpenPeepsTheme } from '~/theme/OpenPeepsThemeProvider';
import { getThemeVars } from '~/theme/utils';

interface BaseSheetProps {
  children: React.ReactNode;
  snapPoints?: string[];
  enablePanDownToClose?: boolean;
  enableOverDrag?: boolean;
  index?: number;
  scrollable?: boolean;
  onDismiss?: () => void;
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
    },
    ref,
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
        setKeyboardVisible(true),
      );
      const hideSub = Keyboard.addListener('keyboardDidHide', () =>
        setKeyboardVisible(false),
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
            ? { width: 'auto', marginLeft: margin, marginRight: margin }
            : {}
        }
        ref={ref}
        index={index}
        snapPoints={snapPoints}
        enablePanDownToClose={enablePanDownToClose}
        enableOverDrag={enableOverDrag}
        backdropComponent={SheetBackdrop}
        onDismiss={onDismiss}
        backgroundStyle={{
          backgroundColor: colors.background,
        }}>
        <ContentComponent style={[{ flex: 1 }, themeVars]}>
          <KeyboardAvoidingView
            className={keyboardVisible ? 'h-[70vh]' : ''}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}>
            {children}
          </KeyboardAvoidingView>
        </ContentComponent>
      </BottomSheetModal>
    );
  },
);
