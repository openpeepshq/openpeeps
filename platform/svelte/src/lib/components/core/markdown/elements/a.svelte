<script lang="ts">
	import { stopPropagation } from '@openpeeps/ui';

	interface Props {
		class?: string;
		href: string;
		title?: string;
		newTab?: boolean | ((link: string) => boolean);
		children?: import('svelte').Snippet;
	}

	let { class: className = 'anchor', href, title = '', newTab = false, children }: Props = $props();
</script>

<a
	{href}
	{title}
	class={className}
	onclick={stopPropagation()}
	target={(typeof newTab === 'function' && newTab(href)) || newTab ? '_blank' : '_self'}
>
	{@render children?.()}
</a>
