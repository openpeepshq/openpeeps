import {View} from 'react-native';
import React from 'react';
import {ThemedText} from '~/components/ui/themed-text';
import {Button} from '~/components/ui/button';
import {
  ImageIcon,
  FilmIcon,
  ChartColumnIcon,
  NotebookIcon,
  PaperclipIcon,
  NewspaperIcon,
} from '~/components/icons';
import {PostCreationData, PostType} from '@openpeeps/common';
import {maxContentLength, maxArticleContentLength} from '~/lib/utils';

interface FooterProps {
  content: PostCreationData;
  onImagePress: () => void;
  onMicPress: () => void;
  onVideoPress: () => void;
  onPollPress: () => void;
  onDocumentPress: () => void;
  onArticlePress: () => void;
  postType?: PostType | undefined;
}

export default function Footer({
  content,
  onImagePress,
  onVideoPress,
  onPollPress,
  onDocumentPress,
  onArticlePress,
  postType = "note",
}: FooterProps) {
  return (
    <View className="absolute bottom-2 w-full">
      <View className="flex-row justify-between items-center p-4">
        <ThemedText className="text-muted-foreground">
          {String(
            (postType === 'note' || postType === 'question'
              ? maxContentLength
              : maxArticleContentLength) - (content?.data.content ?? '').length,
          )}
        </ThemedText>
        <View className="flex-row gap-8">
          {postType != 'article' && (
            <>
              <Button size={'icon'} variant={'ghost'} onPress={onImagePress}>
                <ImageIcon size={24} className="text-foreground" />
              </Button>
              <Button size={'icon'} variant={'ghost'} onPress={onDocumentPress}>
                <PaperclipIcon size={24} className="text-foreground" />
              </Button>
              <Button size={'icon'} variant={'ghost'} onPress={onVideoPress}>
                <FilmIcon size={24} className="text-foreground" />
              </Button>
            </>
          )}
          <Button size={'icon'} variant={'ghost'} onPress={onPollPress}>
            {postType === 'question' ? (
              <NotebookIcon size={24} className="text-foreground" />
            ) : (
              <ChartColumnIcon size={24} className="text-foreground" />
            )}
          </Button>
          <Button size={'icon'} variant={'ghost'} onPress={onArticlePress}>
            {postType === 'article' ? (
              <NotebookIcon size={24} className="text-foreground" />
            ) : (
              <NewspaperIcon size={24} className="text-foreground" />
            )}
          </Button>
        </View>
      </View>
    </View>
  );
}
