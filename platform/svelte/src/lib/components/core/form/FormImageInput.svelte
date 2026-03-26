<script lang="ts">
	import ImageInput from './ImageInput.svelte';
	import { getFormContext, deepSet, deepGet } from '@openpeeps/ui';
	import type { MediaAttachment } from '@openpeeps/common/types';
	import type { ComponentProps } from 'svelte';
	const { data, validate } = getFormContext<{
		header: string;
		avatar: string;
	}>();

	type Props = Omit<ComponentProps<typeof ImageInput>, 'url' | 'onchange'> & {
		path: (string | number)[];
	};

	let { path, ...props }: Props = $props();

	const updateAndValidate = (attachment: MediaAttachment) => {
		deepSet(data, path, attachment.url);
		validate();
	};

	let url = $derived(deepGet(data, path) as string | undefined);
</script>

<ImageInput onchange={updateAndValidate} {url} {...props} />
