import React from 'react';
import { Pressable } from 'react-native';
import { PlusIcon } from '../icons/index';
import { usePageChrome } from './pageChrome';
import { useOpenPeepsTheme } from '../theme/OpenPeepsThemeProvider';
import { parseDimension } from '../theme/utils';

export const PlusButton = () => {
  const { plus } = usePageChrome();
  const { buttonRadius } = useOpenPeepsTheme();
  if (!plus || Array.isArray(plus)) return null;

  const Icon = plus.icon ?? PlusIcon;
  const borderRadius = parseDimension(buttonRadius);

  const onPress = () => {
    if (typeof plus.action === 'function') {
      void plus.action();
    }
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={plus.title || 'New'}
      onPress={onPress}
      style={{ borderRadius }}
      className="bg-primary absolute bottom-10 right-6 z-20 size-16 items-center justify-center rounded-button"
    >
      <Icon size={24} className="text-primary-foreground" />
    </Pressable>
  );
};
