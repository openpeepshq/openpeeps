export const logger = (ns: string, meta?: Record<string, unknown>) => {
	const log = (level: string, ...args: unknown[]) => console.log(`${ns} - ${level}`, ...args, meta);

	return {
		info: (...args: unknown[]) => log('info', ...args),
		warn: (...args: unknown[]) => log('warn', ...args),
		error: (...args: unknown[]) => log('error', ...args),
		fatal: (...args: unknown[]) => log('fatal', ...args),
		debug: (...args: unknown[]) => log('debug', ...args),
		trace: (...args: unknown[]) => log('trace', ...args)
	};
};
