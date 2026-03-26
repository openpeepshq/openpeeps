import type { CreateInfiniteQueryResult, InfiniteQueryObserverResult } from "@tanstack/svelte-query";

const scrollToBtm = (target: HTMLElement | null, options: ScrollIntoViewOptions) => {
	target?.scrollIntoView(options);
};

export const scrollToBottom = (
	endOfThread: HTMLElement | undefined,
	duration = 100,
	behavior: ScrollBehavior = 'auto'
) => {
	if (endOfThread) {
		setTimeout(() => scrollToBtm(endOfThread, { behavior, block: 'nearest', inline: 'nearest' }), duration);
	}
};

export const scrollToElement = (
	target: HTMLElement | null | undefined,
	duration = 100,
	behavior: ScrollBehavior = 'auto',
) => {
	setTimeout(
		() => scrollToBtm(target ?? null, { behavior, block: 'start', inline: 'nearest' }),
		duration,
	);
};

