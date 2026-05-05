import { browser } from '$app/environment';
import { authHeaders } from '$lib/api/base';
import { setContext } from 'svelte';
import type { Action } from 'svelte/action';

const VIEW_DELAY_MS = 1_000;
const FLUSH_INTERVAL_MS = 30_000;
const VISIBILITY_THRESHOLD = 0;
const POST_VIEW_COUNTER_CONTEXT_KEY = 'openpeeps-post-view-counter';

export interface PostViewCounterContext {
	queuePostView: (postId: string) => void;
	flush: () => Promise<void>;
	destroy: () => void;
}

let postViewCounterContext: PostViewCounterContext | undefined;

export const createPostViewCounterContext = (
	markPostsSeen: (postIds: string[]) => Promise<void>,
): PostViewCounterContext => {
	const pendingPostIds = new Set<string>();
	let flushInterval: ReturnType<typeof setInterval> | undefined;
	let flushing = false;

	const flush = async () => {
		if (!browser || flushing || pendingPostIds.size === 0 || !authHeaders()) {
			return;
		}

		const postIds = [...pendingPostIds];
		pendingPostIds.clear();
		flushing = true;

		try {
			await markPostsSeen(postIds);
		} catch {
			postIds.forEach((postId) => pendingPostIds.add(postId));
		} finally {
			flushing = false;
		}
	};

	const startFlushInterval = () => {
		if (!browser || flushInterval) {
			return;
		}

		flushInterval = setInterval(() => {
			void flush();
		}, FLUSH_INTERVAL_MS);
	};

	const queuePostView = (postId: string) => {
		if (!postId || !authHeaders()) {
			return;
		}

		pendingPostIds.add(postId);
		startFlushInterval();
	};

	const flushOnPageHide = () => {
		void flush();
	};

	const flushOnVisibilityHidden = () => {
		if (document.visibilityState === 'hidden') {
			void flush();
		}
	};

	if (browser) {
		window.addEventListener('pagehide', flushOnPageHide);
		document.addEventListener('visibilitychange', flushOnVisibilityHidden);
	}

	return {
		queuePostView,
		flush,
		destroy: () => {
			if (flushInterval) {
				clearInterval(flushInterval);
				flushInterval = undefined;
			}

			if (browser) {
				window.removeEventListener('pagehide', flushOnPageHide);
				document.removeEventListener('visibilitychange', flushOnVisibilityHidden);
			}
		},
	};
};

export const setPostViewCounterContext = (context: PostViewCounterContext) => {
	postViewCounterContext = context;
	setContext(POST_VIEW_COUNTER_CONTEXT_KEY, context);
};

export const flushPostViewCounter = async () => {
	await postViewCounterContext?.flush();
};

export const postViewCounter: Action<HTMLElement, string | undefined> = (node, postId) => {
	const context = postViewCounterContext;

	if (!browser || !postId || !context || !('IntersectionObserver' in window)) {
		return {};
	}

	let trackedPostId = postId;
	let viewTimer: ReturnType<typeof setTimeout> | undefined;
	let counted = false;
	let visible = false;

	const clearViewTimer = () => {
		if (viewTimer) {
			clearTimeout(viewTimer);
			viewTimer = undefined;
		}
	};

	const startViewTimer = () => {
		if (counted || viewTimer) {
			return;
		}

		viewTimer = setTimeout(() => {
			counted = true;
			context.queuePostView(trackedPostId);
			viewTimer = undefined;
		}, VIEW_DELAY_MS);
	};

	const observer = new IntersectionObserver(
		([entry]) => {
			visible = !!entry?.isIntersecting && entry.intersectionRatio > VISIBILITY_THRESHOLD;

			if (visible) {
				startViewTimer();
			} else {
				clearViewTimer();
			}
		},
		{ threshold: VISIBILITY_THRESHOLD },
	);

	observer.observe(node);

	return {
		update(nextPostId) {
			if (!nextPostId || nextPostId === trackedPostId) {
				return;
			}

			clearViewTimer();
			trackedPostId = nextPostId;
			counted = false;
			if (visible) {
				startViewTimer();
			}
		},
		destroy() {
			clearViewTimer();
			observer.disconnect();
		},
	};
};
