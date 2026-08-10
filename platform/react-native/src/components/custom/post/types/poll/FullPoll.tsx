import React from 'react';
import { PublicPost } from '@openpeepshq/common';
import { FullNote } from '../note/FullNote';

interface FullPollProps {
    post: PublicPost;
}

export const FullPoll: React.FC<FullPollProps> = ({ post }) => {
    return (
        <FullNote post={post} />
    );
};
