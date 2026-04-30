import { getToastStore, type ToastSettings } from '@skeletonlabs/skeleton';

interface ToastParameters extends ToastSettings {
	type?: 'success' | 'error';
}

export const toaster = () => {
	const toastStore = getToastStore();

	return ({ message, background, type = 'success', autohide, action }: ToastParameters) =>
		toastStore.trigger(
			{
				message,
				background: background || type === 'success' ? 'variant-filled-success' : 'variant-filled-error',
				autohide: autohide === undefined ? type === 'success' : autohide,
				action
			});

}

export const toast = ({ message, background, autohide = true, action }: ToastSettings) => {
	return {
		message: message,
		// Provide any utility or variant background style:
		background: background,
		autohide: autohide,
		action: action
	};
};

const SLOW_UPLOAD_MS = 10_000;

/** Shows an informational toast if the upload takes longer than 10 seconds. */
export async function withSlowUploadNotice<T>(
	toastNotify: ReturnType<typeof toaster>,
	t: (key: string) => string,
	fn: () => Promise<T>
): Promise<T> {
	let finished = false;
	const timer = setTimeout(() => {
		if (!finished) {
			toastNotify({
				message: t('form.upload.slowNotice'),
				background: 'variant-filled-surface',
				autohide: true,
			});
		}
	}, SLOW_UPLOAD_MS);
	try {
		return await fn();
	} finally {
		finished = true;
		clearTimeout(timer);
	}
}
