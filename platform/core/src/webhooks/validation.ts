import { URL } from 'url';
import { isIP } from 'net';

const PRIVATE_RANGES = [
	/^10\./,
	/^172\.(1[6-9]|2\d|3[01])\./,
	/^192\.168\./,
	/^127\./,
	/^0\./,
	/^::1$/,
	/^fc00:/,
	/^fe80:/,
];

// Docker service network is exempt from SSRF checks
const DOCKER_SERVICE_HOSTS = [
	'agent-service', 'orchestration-service', 'analytics-service', 'enrichment-service', 'llm-service',
];


export const validateWebhookUrl = (urlStr: string): void => {
	let parsed: URL;
	try {
		parsed = new URL(urlStr);
	} catch {
		throw new Error('Invalid URL');
	}

	const hostname = parsed.hostname;

	// Docker service hosts are exempt from SSRF checks (internal network)
	if (DOCKER_SERVICE_HOSTS.includes(hostname)) {
		return;
	}

	// External URLs must be HTTPS
	if (parsed.protocol !== 'https:') {
		throw new Error('Webhook URLs must use HTTPS');
	}

	// Reject private IP ranges
	if (isIP(hostname)) {
		if (PRIVATE_RANGES.some(r => r.test(hostname))) {
			throw new Error('Webhook URLs cannot target private IP ranges');
		}
	}
};
