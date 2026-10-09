import React, { useCallback, type ReactNode } from 'react';
import type { PublicPost } from '@openpeepshq/common/types';
import { ReplyOpenerProvider, useReplyOpener } from '@openpeepshq/react';
import { navigationRef } from '../../navigation/nativeRouter';

/** Native counterpart of the web modal: opens the full-screen `ReplyPost` page. */
export const ReplyModalProvider = ({ children }: { children: ReactNode }) => {
  const openReply = useCallback((post: PublicPost) => {
    if (!navigationRef.isReady()) return;
    navigationRef.navigate('Main', {
      screen: 'ReplyPost',
      params: { id: post.id },
    });
  }, []);

  return (
    <ReplyOpenerProvider openReply={openReply}>{children}</ReplyOpenerProvider>
  );
};

export const useReplyModal = () => {
  const openReply = useReplyOpener();
  return { openReply };
};
