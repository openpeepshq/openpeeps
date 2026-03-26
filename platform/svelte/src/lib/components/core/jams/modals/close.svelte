<script lang="ts">
	import { getModalManager, ModalFooter, ModalHeader, ModalWrapper, Button } from '@openpeeps/ui';

	const modalManager = getModalManager();

	interface Props {
		handleConfirm?: () => void;
		title?: string;
		body?: string;
		cancelText?: string;
		confirmText?: string;
		onCancel?: () => void;
		isError?: boolean;
	}

	const handleCancel = () => {
		modalManager.close();
	};
	let {
		handleConfirm = () => {},
		title = 'Close',
		body = 'Are you sure you want to close?',
		cancelText = 'Cancel',
		confirmText = 'Confirm',
		onCancel = handleCancel,
		isError = false
	}: Props = $props();
</script>

<ModalWrapper width={'md:w-1/3 w-modal'}>
	<!-- header -->
	<ModalHeader {title} />
	<!-- content -->
	<div class="p-4">
		<p>{body}</p>
	</div>

	<!-- footer -->
	<ModalFooter extraClassNames={'gap-x-4'}>
		<Button
			title={confirmText}
			action={handleConfirm}
			variant={isError ? 'variant-ghost-primary' : 'variant-filled-error'}
		>
			{confirmText}
		</Button>
		<Button
			title={cancelText}
			action={onCancel}
			variant={isError ? 'variant-filled-error' : 'variant-ghost-primary'}
		>
			{cancelText}
		</Button>
	</ModalFooter>
</ModalWrapper>
