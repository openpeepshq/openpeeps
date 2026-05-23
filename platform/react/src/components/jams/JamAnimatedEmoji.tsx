import { useEffect, useRef } from 'react';
import animateEmoji from './animateEmoji';

export interface JamAnimatedEmojiProps {
  emoji: string;
}

export function JamAnimatedEmoji({ emoji }: JamAnimatedEmojiProps) {
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (elementRef.current) {
      animateEmoji(elementRef.current);
    }
  }, [emoji]);

  return (
    <div
      ref={elementRef}
      className="pointer-events-none absolute bottom-0 right-1/3 size-16 bg-transparent pt-3 text-center text-4xl md:size-24 md:pt-4 md:text-6xl"
      style={{ alignSelf: 'center' }}
    >
      {emoji}
    </div>
  );
}
