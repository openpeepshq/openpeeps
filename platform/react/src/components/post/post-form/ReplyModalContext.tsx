import { useCallback, useState, type ReactNode } from 'react';
import type { PublicPost } from '@openpeepshq/common/types';
import {
  ReplyOpenerProvider,
  useReplyOpener,
} from '../../../hooks/posts/replyOpener';
import { ReplyModal } from './ReplyModal';

export const ReplyModalProvider = ({ children }: { children: ReactNode }) => {
  const [replyTo, setReplyTo] = useState<PublicPost | undefined>();

  const openReply = useCallback((post: PublicPost) => {
    setReplyTo(post);
  }, []);

  return (
    <ReplyOpenerProvider openReply={openReply}>
      {children}
      {replyTo ? (
        <ReplyModal post={replyTo} onClose={() => setReplyTo(undefined)} />
      ) : null}
    </ReplyOpenerProvider>
  );
};

export const useReplyModal = () => {
  const openReply = useReplyOpener();
  return { openReply };
};
