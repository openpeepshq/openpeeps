<script lang="ts">
	import type { PublicPost } from '@openpeeps/common/types';
	import { FeedPostContent } from '$lib/components';
	import { getCurrentProfile } from '$lib/auth';

	const me = getCurrentProfile();

	interface Props {
		message: PublicPost;
	}

	let { message }: Props = $props();

	const myMessage = message?.profile.id === me?.id;
</script>

<div class="mt-4 flex w-full {myMessage ? 'justify-end' : 'justify-start'}">
	<!-- content -->
	<div
		class="mt-2 w-[80%] rounded-t-xl p-3 md:w-[60%]
  {myMessage ? 'variant-soft-primary rounded-bl-xl' : 'bg-surface-200 rounded-br-xl'}
  "
	>
		<!-- attachments -->
		<FeedPostContent post={message} />
	</div>
</div>
