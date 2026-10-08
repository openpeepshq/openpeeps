import { createContext, useContext, type ReactNode } from 'react';
import type { PublicPost } from '@openpeepshq/common/types';

export type ReplyOpener = (post: PublicPost) => void;

const ReplyOpenerContext = createContext<ReplyOpener | null>(null);

/** Hosts supply how a reply opens: a modal on web, a screen on native. */
export const ReplyOpenerProvider = ({
  openReply,
  children,
}: {
  openReply: ReplyOpener;
  children: ReactNode;
}) => (
  <ReplyOpenerContext.Provider value={openReply}>
    {children}
  </ReplyOpenerContext.Provider>
);

export const useReplyOpener = (): ReplyOpener => {
  const openReply = useContext(ReplyOpenerContext);
  if (!openReply) {
    throw new Error('useReplyOpener must be used within ReplyOpenerProvider');
  }
  return openReply;
};
