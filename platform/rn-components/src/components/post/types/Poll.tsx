import React from 'react';
import type { PublicPost } from '@openpeepshq/common/types';

import { Attachments } from '../pieces/Attachments';

import { View } from 'react-native';
import { OpenpeepsMarkdown } from '../../markdown/index';
import { ThemedText } from '../../ui/themed-text';
import { PollContent } from '../pieces/PollContent';

export interface FeedPollProps {
  post: PublicPost;
  /** When false, show static options only (no voting). */
  interactive?: boolean;
}

export const FeedPoll = ({
  post,
  interactive: _interactive = true,
}: FeedPollProps) =>
  post?.data?.type === 'question' ? (
    <View>
      <Attachments {...{ post }} />
      <OpenpeepsMarkdown
        source={post?.data?.content || ''}
        linkPreviewMode={post?.data?.attachments?.length ? 'none' : 'append'}
      />
      <PollContent {...{ post }} />
    </View>
  ) : (
    <View>
      <ThemedText className="text-destructive">
        This Feed-Note Component was used but the post type on the server is not
        of type "note". Please report this to the Developers
      </ThemedText>
    </View>
  );
