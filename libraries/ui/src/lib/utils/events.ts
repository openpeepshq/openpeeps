export const preventDefault =
	<T extends Event>(handler?: (event: T, ...args: unknown[]) => unknown | Promise<unknown>) =>
	(event: T, ...args: unknown[]) => {
		event.preventDefault();
		handler?.(event, ...args);
	};

export const stopPropagation =
	<T extends Event>(handler?: (event: T, ...args: unknown[]) => unknown | Promise<unknown>) =>
	(event: T, ...args: unknown[]) => {
		event.stopPropagation();
		handler?.(event, ...args);
	};
