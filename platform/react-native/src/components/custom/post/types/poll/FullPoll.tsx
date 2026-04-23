import React from 'react';
import { PublicPost } from '@openpeeps/common';
import { FullNote } from '../note/FullNote';

interface FullPollProps {
    post: PublicPost;
}

export const FullPoll: React.FC<FullPollProps> = ({ post }) => {
    return (
        <FullNote post={post} />
    );
};
