import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { isJamPath, isPostPath, isGroupPath } from './helpers';
import { PostPreview } from './local/PostPreview';
import { JamPreview } from './local/JamPreview';
import { GroupPreview } from './local/GroupPreview';
import { handleInternalURLNavigation } from '~/lib/utils';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainStackParamList } from '~/components/navigation/types';
import { buildGoto } from '~/components/navigation/helpers';

interface LocalPreviewLinkProps {
  url: string;
}

export const LocalPreviewLink = ({ url }: LocalPreviewLinkProps) => {
  const path = new URL(url).pathname;
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const goto = buildGoto(navigation);

  const isPost = isPostPath(path);
  const isJam = isJamPath(path);
  const isGroup = isGroupPath(path);

  const handlePress = () => {
    handleInternalURLNavigation(url, goto);
  };

  return (
    <TouchableOpacity onPress={handlePress}>
      <View className="card w-full p-3">
        {isPost && <PostPreview path={path} />}
        {isGroup && <GroupPreview path={path} />}
        {isJam && <JamPreview path={path} />}
      </View>
    </TouchableOpacity>
  );
};

