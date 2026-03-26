import type { Component, ComponentProps } from 'svelte';
import { getModalStore, type ModalSettings } from '@skeletonlabs/skeleton';
import Modal from './Modal.svelte';

export { default as ModalHeader } from './ModalHeader.svelte';
export { default as ModalWrapper } from './ModalWrapper.svelte';
export { default as ModalFooter } from './ModalFooter.svelte';

export const getModalManager = () => {
	const modalStore = getModalStore();

	const show = (modalSettings: ModalSettings) =>
		modalStore.update((stack) => [modalSettings, ...stack]);

	return {
		close: () => modalStore.close(),
		show: <P extends Component<any>, R = undefined>(
			component: P,
			properties?: Omit<ComponentProps<P>, 'close' | 'setResponse'>,
			callback?: (response: R | undefined) => void | Promise<void>
		) =>
			show({
				type: 'component',
				component: {
					ref: Modal
				},
				meta: {
					properties: {
						...properties,
						close: () => modalStore.close(),
						setResponse: (response: R | undefined) =>
							modalStore.update(($modalStore) => {
								$modalStore[0].response?.(response);
								return $modalStore;
							})
					},
					component
				},
				response: callback
			})
	};
};
