import { createReadStream, existsSync, mkdirSync } from "node:fs";
import { appendFile } from "node:fs/promises";
import { join } from "node:path";
import * as readline from "node:readline";
import type { Logger, LoggerFactory } from "@openpeeps/common/types";
import { formatDate } from "date-fns/format";
import safeJsonStringify from "safe-json-stringify";
import { default as logsConfig } from "../config/defaults/logs";

const createLogDirectory = () =>
	mkdirSync(logsConfig.local.path, { recursive: true });

const currentFile = (date: Date) =>
	join(logsConfig.local.path, formatDate(date, "yyyyMMdd") + ".log");

export const listLogs = async (date: Date = new Date()) => {
	const filePath = currentFile(date);
	if (!existsSync(filePath)) {
		return [];
	}

	const stream = createReadStream(filePath);
	const iterator = readline.createInterface({
		input: stream,
		crlfDelay: Infinity,
	});

	const lines = [];

	for await (const logLine of iterator) {
		try {
			lines.push(JSON.parse(logLine));
		} catch {
			// skip malformed lines
		}
	}
	return lines.reverse();
};

const logLevels = {
	trace: 10,
	debug: 20,
	info: 30,
	warn: 40,
	error: 50,
	fatal: 60,
	silent: Number.POSITIVE_INFINITY,
};

const defaultLogLevel = logLevels.info;

const namespaceLogLevels: Record<string, number> = {};

export const logger: LoggerFactory = (
	ns: string,
	meta?: Record<string, unknown>,
): Logger => {
	createLogDirectory();
	const log = (level: keyof typeof logLevels, ...args: unknown[]) => {
		if (logLevels[level] < (namespaceLogLevels[ns] ?? defaultLogLevel)) {
			return;
		}
		const date = new Date();
		console.log(
			`${date.toISOString()} - ${ns} - ${level} | `,
			...args,
			meta ?? "",
		);

		appendFile(
			currentFile(date),
			JSON.stringify({
				level,
				message: args
					.map((a) =>
						a !== null && typeof a === "object" ? safeJsonStringify(a) : a,
					)
					.join(" "),
				timestamp: date.toISOString(),
				meta,
				namespace: ns,
			}) + "\n",
		).then();
	};

	return {
		info: (...args: unknown[]) => log("info", ...args),
		warn: (...args: unknown[]) => log("warn", ...args),
		error: (...args: unknown[]) => log("error", ...args),
		fatal: (...args: unknown[]) => log("fatal", ...args),
		debug: (...args: unknown[]) => log("debug", ...args),
		trace: (...args: unknown[]) => log("trace", ...args),
	};
};
