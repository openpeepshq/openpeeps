import React from 'react';
import { Pressable } from 'react-native';
import { PlusIcon } from '../icons/index';
import { usePageChrome } from './pageChrome';

// PlusButton is always fully round — it doesn't use the theme's buttonRadius
// setting (which is for regular buttons). On web, circular elements have a
// separate theme token; on RN we use a static 9999px (same as rounded-full).
const PLUS_BUTTON_RADIUS = 9999;

export const PlusButton = () => {
  const { plus } = usePageChrome();
  if (!plus || Array.isArray(plus)) return null;

  const Icon = plus.icon ?? PlusIcon;

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
      style={{ borderRadius: PLUS_BUTTON_RADIUS }}
      className="bg-primary absolute bottom-10 right-6 z-20 size-16 items-center justify-center rounded-button"
    >
      <Icon size={24} className="text-primary-foreground" />
    </Pressable>
  );
};
