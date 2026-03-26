import { initializePageHeaderStore } from './pageHeader';
import { initializeBreadcrumbsStore } from './breadcrumbs';
import { initializePlusButtonStore } from './plusButton';

export { getPageHeaderStore, setPageHeader } from './pageHeader';
export { getBreadcrumbsStore } from './breadcrumbs';
export { getPlusButtonStore, setPlusButtonActions } from './plusButton';

export const initializePageStores = () => {
	initializePageHeaderStore();
	initializeBreadcrumbsStore();
	initializePlusButtonStore();
};

export { initializeNewPostStores, getNewPostStores, eventSanitizer } from './newPosts';