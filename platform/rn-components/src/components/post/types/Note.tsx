import React from 'react';
import { View } from 'react-native';
import type { PublicPost } from '@openpeepshq/common/types';
import { ThemedText } from '../../ui/themed-text';
import { OpenpeepsMarkdown } from '../../markdown/index';
import { Attachments } from '../pieces/Attachments';

export interface FeedNoteProps {
  post: PublicPost;
}

export const FeedNote = ({ post }: FeedNoteProps) =>
  post?.data?.type === 'note' ? (
    <View>
      <OpenpeepsMarkdown
        source={post?.data?.content || ''}
        mentions={post.mentions}
        linkPreviewMode={post?.data?.attachments?.length ? 'none' : 'append'}
      />
      <Attachments {...{ post }} />
    </View>
  ) : (
    <View>
      <ThemedText className="text-destructive">
        This Feed-Note Component was used but the post type on the server is not
        of type "note". Please report this to the Developers
      </ThemedText>
    </View>
  );
