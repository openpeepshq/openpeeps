import React from 'react';
import { Pressable } from 'react-native';
import { PlusIcon } from '../icons/index';
import { usePageChrome } from './pageChrome';

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
      className="bg-primary absolute bottom-10 right-6 z-20 size-16 items-center justify-center rounded-button"
    >
      <Icon size={24} className="text-primary-foreground" />
    </Pressable>
  );
};
