import type { FeedFormat } from '@openpeepshq/common';
import { createStore, useStore } from './createStore';

export const feedFormatSessionStore = createStore<FeedFormat | undefined>(
  undefined,
);

export const useFeedFormatSession = () => {
  const session = useStore(feedFormatSessionStore);
  return {
    session,
    setSessionFormat: (format: FeedFormat) => {
      feedFormatSessionStore.set(format);
    },
    clearSessionFormat: () => {
      feedFormatSessionStore.set(undefined);
    },
  };
};
