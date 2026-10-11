import React from 'react';
import { Pressable } from 'react-native';
import { PlusIcon } from '../icons/index';
import { usePageChrome } from './pageChrome';

export const PlusButton = () => {
  const { plus } = usePageChrome();
  if (!plus || Array.isArray(plus)) return null;

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
      className="bg-foreground absolute bottom-10 right-6 z-20 size-16 items-center justify-center rounded-full"
    >
      <PlusIcon size={24} className="text-background" />
    </Pressable>
  );
};
