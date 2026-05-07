<script lang="ts">
	import PostActionButton from './PostActionButton.svelte';
	import { ThumbsUp } from 'lucide-svelte';
	import type { PublicPost } from '@openpeeps/common/types';
	import { me } from '$lib/api';
	import { reactToPostMutation, retractReactionMutation } from '$lib/api';
	import { postReactionStats } from '../../helpers';
	import { hasValue } from '@openpeeps/common';
	import { i18nContext } from '$lib/components/i18n';

	interface Props {
		post: PublicPost;
		compact?: boolean;
	}

	let { post = $bindable(), compact = false }: Props = $props();

	const { t } = i18nContext();
	const reactToPost = reactToPostMutation({ id: post.id });
	const retractReaction = retractReactionMutation({ id: post.id });

	const checkOwnReaction = () => {
		return post.reactions?.some((r) => r.profile.id === $me?.id);
	};

	let iReacted: boolean = $state(checkOwnReaction());

	const handleReaction = async () => {
		if (iReacted) {
			post.reactions = post.reactions.filter((r) => r.profile.id !== $me?.id);
			iReacted = checkOwnReaction();
			await retractReaction();
		} else {
			post.reactions = [...post.reactions, { profile: $me, reaction: '👍' }];
			iReacted = checkOwnReaction();
			await reactToPost({ reaction: '👍' });
		}
	};

	let text: string = $derived(compact ? `· ${postReactionStats(post)}` : t('posts.footer.like'));
	let isGroupPost = $derived(hasValue(post.groupId));
	let membershipExists = $derived(
		$me.memberships.map((m) => m.group.id).find((groupId) => groupId === post?.group?.id)
			? true
			: false
	);
</script>

<PostActionButton
	icon={ThumbsUp}
	action={handleReaction}
	active={iReacted}
	{text}
	disabled={isGroupPost && !membershipExists}
/>
