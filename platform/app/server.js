/**
 * Custom production entrypoint that wraps `@sveltejs/adapter-node`'s built
 * server so we can override `http.Server` timeout properties that the adapter
 * does not (yet) expose via environment variables.
 *
 * Specifically, we want control over `server.requestTimeout`. Node 18+ defaults
 * it to 300_000 ms (5 minutes), which silently kills long media uploads from
 * users on slow uplinks at the 5-minute mark — even when the upload is making
 * steady progress and Traefik is configured with no timeouts of its own.
 *
 * Setting `REQUEST_TIMEOUT=0` (the default below) disables the cap entirely.
 * Set it to a positive integer (seconds) to keep some slowloris protection
 * while still giving uploads enough time to complete.
 */

import process from 'node:process';
import { server } from './build/index.js';

const parseSeconds = (name) => {
	const raw = process.env[name];
	if (raw === undefined || raw === '') return undefined;
	const parsed = Number.parseInt(raw, 10);
	if (Number.isNaN(parsed) || parsed < 0) {
		throw new Error(
			`Invalid value for ${name}: ${JSON.stringify(raw)} (expected a non-negative integer in seconds)`,
		);
	}
	return parsed;
};

const requestTimeoutSeconds = parseSeconds('REQUEST_TIMEOUT') ?? 0;

const httpServer = server.server;

if (!httpServer) {
	throw new Error(
		'Could not access the underlying http.Server on the adapter-node export — has the adapter API changed?',
	);
}

httpServer.requestTimeout = requestTimeoutSeconds * 1000;

console.log(
	`server.requestTimeout=${httpServer.requestTimeout}ms ` +
		`headersTimeout=${httpServer.headersTimeout}ms ` +
		`keepAliveTimeout=${httpServer.keepAliveTimeout}ms`,
);
