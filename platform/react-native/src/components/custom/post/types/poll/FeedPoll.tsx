import React from 'react';
import type { PublicPost } from '@openpeeps/common/types';

import { Attachments } from '~/components/custom/post/pieces/Attachments';

import { View } from 'react-native';
import { OpenPeepsMarkdown } from '~/components/custom/markdown';
import { ThemedText } from '~/components/ui/themed-text';
import { PollContent } from '../../pieces/PollContent';

interface Props {
    post: PublicPost;
}

export const FeedPoll = ({ post }: Props) =>
    (post?.data?.type === 'question') ?
        (
            <View>
                <Attachments {...{ post }} />
                <OpenPeepsMarkdown
                    source={post?.data?.content || ''}
                    linkPreviewMode={post?.data?.attachments?.length ? 'none' : 'append'}
                />
                <PollContent {...{ post }} />
            </View>
        )
        :
        (
            <View>
                <ThemedText className="text-red-500">
                    This Feed-Note Component was used but the post type on the server is not of
                    type "note". Please report this to the Developers
                </ThemedText>
            </View>
        );
