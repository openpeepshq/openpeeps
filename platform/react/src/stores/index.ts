export {
  createStore,
  useStore,
  persistedStore,
  type ReactStore,
} from './createStore';
export {
  breadcrumbsStore,
  setBreadcrumbs,
  useBreadcrumbs,
} from './breadcrumbs';
export { pageHeaderStore, usePageHeader, useSetPageHeader } from './pageHeader';
export {
  plusButtonStore,
  usePlusButton,
  useSetPlusButtonActions,
} from './plusButton';
export {
  initializeNewPostStores,
  getNewPostStores,
  useNewPostStores,
  resetStore,
  defaultNewArticle,
  defaultNewEvent,
  defaultNewNote,
  defaultNewQuestion,
  eventSanitizer,
  getReplyStore,
  resetReplyData,
  useReplyStore,
} from './newPosts';
export type {
  Crumb,
  PageHeader,
  PlusButtonAction,
  PlusButtonActions,
  NewPostsState,
} from './types';

export const initializePageStores = () => {
  // page-scoped stores live module-level — calling this is a no-op kept for
  // API compatibility with @openpeeps/svelte.
};
