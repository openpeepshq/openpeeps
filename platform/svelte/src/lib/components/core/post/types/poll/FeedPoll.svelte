<script lang="ts">
	import type { PublicPost } from '@openpeeps/common/types';
	import Attachments from '../../pieces/Attachments.svelte';
	import PollContent from '../../pieces/PollContent.svelte';
	import OpenpeepsMarkdown from '$lib/components/core/markdown/OpenpeepsMarkdown.svelte';

	interface Props {
		post: PublicPost;
	}

	let { post }: Props = $props();
</script>

{#if post?.data?.type === 'question'}
	<div>
		<OpenpeepsMarkdown
			source={post?.data?.content}
			linkPreviewMode={post?.data?.attachments?.length ? 'none' : 'append'}
			mentions={post?.mentions}
			newTab={true}
		/>
		<!-- attachments -->
		<Attachments {post} />
		<PollContent {post} />
	</div>
{:else}
	<h1>
		This Feed-Poll Component was used but the post type on the server is not of type "question".
		Please report this to the Developers
	</h1>
{/if}
