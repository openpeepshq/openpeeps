import {Pressable} from 'react-native';
import React from 'react';
import {PencilLineIcon} from '../../icons';
interface NewPostButtonProps {
  onPress: () => void;
}
export const NewPostButton = ({onPress}: NewPostButtonProps) => {
  return (
    <Pressable
      onPress={onPress}
      className="z-20 absolute bottom-10 right-6 size-16 flex items-center justify-center bg-foreground rounded-full">
      <PencilLineIcon size={24} className="text-background"/>
    </Pressable>
  );
};
