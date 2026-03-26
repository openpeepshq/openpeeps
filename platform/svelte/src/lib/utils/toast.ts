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
