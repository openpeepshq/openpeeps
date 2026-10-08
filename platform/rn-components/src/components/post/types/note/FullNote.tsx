import React from 'react';
import type { PublicPost } from '@openpeepshq/common';
import { useNavigation } from '@react-navigation/native';
import { FullPostLayout } from '../../FullPostLayout';

export interface FullNoteProps {
  post: PublicPost;
}

export const FullNote = ({ post }: FullNoteProps) => {
  const navigation = useNavigation();
  return (
    <FullPostLayout post={post} deleteCallback={() => navigation.goBack()} />
  );
};
