import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react';
import type { PublicPost } from '@openpeeps/common/types';
import { ReplyModal } from './ReplyModal';

interface ReplyModalContextValue {
  openReply: (post: PublicPost) => void;
}

const ReplyModalContext = createContext<ReplyModalContextValue | null>(null);

export function ReplyModalProvider({ children }: { children: ReactNode }) {
  const [replyTo, setReplyTo] = useState<PublicPost | undefined>();

  const openReply = useCallback((post: PublicPost) => {
    setReplyTo(post);
  }, []);

  return (
    <ReplyModalContext.Provider value={{ openReply }}>
      {children}
      {replyTo ? (
        <ReplyModal post={replyTo} onClose={() => setReplyTo(undefined)} />
      ) : null}
    </ReplyModalContext.Provider>
  );
}

export function useReplyModal() {
  const ctx = useContext(ReplyModalContext);
  if (!ctx) {
    throw new Error('useReplyModal must be used within ReplyModalProvider');
  }
  return ctx;
}
