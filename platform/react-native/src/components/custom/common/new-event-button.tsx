import {Pressable} from 'react-native';
import React from 'react';
import {PlusIcon} from '../../icons';

interface NewEventButtonProps {
  onPress: () => void;
}

export const NewEventButton: React.FC<NewEventButtonProps> = ({onPress}) => (
  <Pressable
    onPress={onPress}
    className="z-20 absolute bottom-10 right-6 size-16 flex items-center justify-center bg-foreground rounded-full">
    <PlusIcon size={24} className="text-background" />
  </Pressable>
);
