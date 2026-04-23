import React from 'react';
import { useOwnReactionsStore } from '../../../../stores/useJamStore';
import { AnimatedEmoji } from './animated-emoji';

export const OwnReactions = () => {
  const { ownReactions } = useOwnReactionsStore();
  return (
    <>
      {ownReactions.map((reaction, idx) => (
        <AnimatedEmoji key={idx} emoji={reaction?.content ?? ''} />
      ))}
    </>
  );
};
