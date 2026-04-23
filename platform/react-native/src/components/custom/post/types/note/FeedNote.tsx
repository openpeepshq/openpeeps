import React from 'react';
import type { PublicPost } from '@openpeeps/common/types';

import { Attachments } from '../../pieces/Attachments';

import { View } from 'react-native';
import { ThemedText } from '../../../../ui/themed-text';
import { OpenPeepsMarkdown } from '../../../markdown';

interface Props {
    post: PublicPost;
}

export const FeedNote = ({ post }: Props) =>
    (post?.data?.type === 'note')
        ?
        (
            <View>
                <Attachments {...{ post }} />
                <OpenPeepsMarkdown
                    source={post?.data?.content || ''}
                    linkPreviewMode={post?.data?.attachments?.length ? 'none' : 'append'}
                />
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
