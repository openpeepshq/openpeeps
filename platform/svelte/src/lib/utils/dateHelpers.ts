export const browserTZ = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

/**
 * Compact "remaining time" formatter for ETAs. Returns the two most-significant
 * non-zero units so the display stays readable without padding zeros:
 *
 *   45 000 ms       → "45s"
 *   90 000 ms       → "1m 30s"
 *   3 720 000 ms    → "1h 2m"
 *   7 260 000 ms    → "2h 1m"
 *
 * Sub-second values round up to "1s" so we never report "0s remaining" while
 * the underlying upload/processing is still genuinely running.
 */
export const formatRemainingDuration = (ms: number): string => {
	const totalSeconds = Math.max(1, Math.ceil(ms / 1000));
	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = totalSeconds % 60;
	if (hours > 0) return `${hours}h ${minutes}m`;
	if (minutes > 0) return `${minutes}m ${seconds}s`;
	return `${seconds}s`;
};
