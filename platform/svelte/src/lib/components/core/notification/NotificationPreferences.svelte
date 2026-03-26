<script lang="ts">
	import { authenticatedCoreApiClient } from '$lib/api';
	import { toast } from '$lib/utils/toast';

	import { getModalStore, getToastStore } from '@skeletonlabs/skeleton';
	import { Button } from '@openpeeps/ui';
	import { useQueryClient } from '@tanstack/svelte-query';
	import { ModalHeader, ModalWrapper } from '@openpeeps/ui';

	const modalStore = getModalStore();
	const toastStore = getToastStore();
	const queryClient = useQueryClient();

	const handleClearNotification = async () => {
		await authenticatedCoreApiClient()
			.put('/profiles/current/notifications/mark-all-seen')
			?.then((res) => res.json());

		toastStore.trigger(
			toast({
				message: 'Notifications cleared successfully',
				background: 'variant-filled-success',
				autohide: true
			})
		);
		await queryClient.invalidateQueries({
			queryKey: ['profiles', 'current', 'notifications']
		});
	};
</script>

{#if $modalStore[0]}
	<ModalWrapper>
		<ModalHeader title={'Notification feed preferences'} />
		<!-- body -->
		<article class="flex flex-col px-4">
			<div class="">
				<p class="text-sm font-light">Manage the content you see on your notifications feed</p>
				<Button
					title="Mark all as read"
					action={handleClearNotification}
					variant="variant-ringed-surface"
				>
					Mark all as read
				</Button>
			</div>
			<!-- <div class="mt-7">
        <div
          class="flex items-center bg-surface-100 rounded-md mb-3 justify-between p-3"
        >
          <div>
            <p class="font-medium text-lg">Unread notifications</p>
            <p class="text-base font-light pr-10">
              Highlight unread notifications
            </p>
          </div>
          <SlideToggle
            name="slide"
            bind:checked={isUnreadNotificationChecked}
            background="bg-surface-300"
            active="bg-primary-500"
          />
        </div>
      </div>
      <div class="mt-4 bg-surface-100 rounded-md mb-3 p-3">
        <div class="mb-3">
          <div class="flex items-center justify-between">
            <div>
              <p class="font-medium text-lg">New Followers</p>
              <p class="text-base font-light pr-10">
              </p>
            </div>
            <SlideToggle
              name="slide"
              bind:checked={isNewFollowersChecked}
              background="bg-surface-300"
              active="bg-primary-500"
            />
          </div>
        </div>
      </div>
      <div class="mt-4 bg-surface-100 rounded-md mb-3 p-3">
        <div class="mb-3">
          <div class="flex items-center justify-between">
            <div>
              <p class="font-medium text-lg">New Post</p>
              <p class="text-base font-light pr-10">
              </p>
            </div>
            <SlideToggle
              name="slide"
              bind:checked={isNewPostChecked}
              background="bg-surface-300"
              active="bg-primary-500"
            />
          </div>
        </div>
      </div>
      <div class="mt-4 bg-surface-100 rounded-md mb-3 p-3">
        <div class="mb-3">
          <div class="flex items-center justify-between">
            <div>
              <p class="font-medium text-lg">Mentions</p>
              <p class="text-base font-light pr-10">
              </p>
            </div>
            <SlideToggle
              name="slide"
              bind:checked={isMentionsChecked}
              background="bg-surface-300"
              active="bg-primary-500"
            />
          </div>
        </div>
      </div>
      <div class="mt-4 bg-surface-100 rounded-md mb-3 p-3">
        <div class=" mb-3">
          <div class="flex items-center justify-between">
            <div>
              <p class="font-medium text-lg">Reposts</p>
              <p class="text-base font-light pr-10">
              </p>
            </div>
            <SlideToggle
              name="slide"
              bind:checked={isRepostsChecked}
              background="bg-surface-300"
              active="bg-primary-500"
            />
          </div>
        </div>
      </div> -->
		</article>
	</ModalWrapper>
{/if}
