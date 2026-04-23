import React from 'react';
import {useNavigation} from '@react-navigation/native';
import {PlusIcon} from '../../icons';
import {Pressable} from 'react-native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {MainStackParamList} from '../../navigation/types';

export const NewJamButton = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();

  return (
    <Pressable
      onPress={() => navigation.navigate('CreateNewJam')}
      className="z-20 absolute bottom-10 right-6 size-16 flex items-center justify-center bg-foreground rounded-full">
      <PlusIcon size={24} className="text-background" />
    </Pressable>
  );
};
