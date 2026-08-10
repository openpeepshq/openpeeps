import { View, Image, TouchableOpacity } from 'react-native';
import React from 'react';
import { ThemedText } from '~/components/ui/themed-text';
import { Article, PublicPost } from '@openpeepshq/common';
import { truncateText } from '~/lib/utils';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainStackParamList } from '~/components/navigation/types';

interface CardArticleProps {
  post: PublicPost;
}

export const CardArticle = ({ post }: CardArticleProps) => {

  const article = post.data as Article;
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();

  return (
    <TouchableOpacity
      onPress={() => {
        navigation.navigate('Post', {
          id: post.id,
        });
      }}
      className="flex mb-6 w-full border-[0.5px] border-gray-100/50 rounded-lg">
      {article.image && (
        <View className="w-full h-[200px]">
          <Image
            source={{ uri: article.image }}
            className="w-full h-full rounded-t-md"
          />
        </View>)}
      <View className="grid gap-y-5 p-4">
        <ThemedText className="text-xl font-semibold">
          {truncateText(article.title, 100) || '-'}
        </ThemedText>
      </View>
    </TouchableOpacity>
  );
};
