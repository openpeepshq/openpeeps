<script lang="ts">
	import PostActionButton from './PostActionButton.svelte';
	import { Share } from 'lucide-svelte';
	import type { PublicPost } from '@openpeeps/common/types';
	import { i18nContext } from '$lib/components/i18n';

	interface Props {
		post: PublicPost;
		compact?: boolean;
	}

	let { post, compact = false }: Props = $props();

	const { t } = i18nContext();
	const handleShare = () => window.alert(`Sharing post ${post.id}`);

	let text: string = $derived(compact ? '' : t('posts.footer.share'));
</script>

<PostActionButton icon={Share} {text} action={handleShare} />
