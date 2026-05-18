<script lang="ts">
	import { page } from '$app/state';
	import { stopPropagation } from '@openpeeps/ui';
	import { isExternalLink } from '../utils';

	interface Props {
		class?: string;
		href: string;
		title?: string;
		newTab?: boolean | ((link: string) => boolean);
		children?: import('svelte').Snippet;
	}

	let { class: className = 'anchor', href, title = '', newTab = false, children }: Props = $props();

	const openInNewTab = $derived(
		isExternalLink(href, page.url.origin) ||
			(typeof newTab === 'function' ? newTab(href) : newTab),
	);
</script>

<a
	{href}
	{title}
	class={className}
	onclick={stopPropagation()}
	target={openInNewTab ? '_blank' : '_self'}
	rel={openInNewTab ? 'noopener noreferrer' : undefined}
>
	{@render children?.()}
</a>
