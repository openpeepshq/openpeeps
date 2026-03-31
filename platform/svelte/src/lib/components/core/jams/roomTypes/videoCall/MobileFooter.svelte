<script lang="ts">
	import { CircleEllipsis, Laugh, X, Copy } from 'lucide-svelte';
	import MicrophoneSelectorAndSwitch from '../../pieces/MicrophoneSelectorAndSwitch.svelte';
	import CameraSelectorAndSwitch from '../../pieces/CameraSelectorAndSwitch.svelte';
	import LeaveCloseButton from '$lib/components/core/jams/pieces/LeaveCloseButton.svelte';
	import { getLivekitRoom } from '$lib/components/core/jams/context';

	import { addEventMutation } from '$lib/api';
	import { sendReaction } from '../../actions';
	import { page } from '$app/stores';
	import MobileMenu from '../../pieces/MobileMenu.svelte';
	import AudioOutputSelector from '../../pieces/AudioOutputSelector.svelte';
	import ReactionMenu from '../../pieces/ReactionMenu.svelte';

	const addEvent = addEventMutation();
	const room = getLivekitRoom();

	let isMobileEmojiMenuOpen = $state(false);
	let isMobileOptionsMenuOpen = $state(false);
	let isJamDetailsMenuOpen = $state(false);

	const handleEmojiSelect = async (emoji: string) => {
		await sendReaction(room, emoji, addEvent);
	};
</script>

<div
	class="bg-surface-50/75 fixed bottom-0 flex w-full items-center justify-between gap-x-2 px-2 py-3 md:hidden"
>
	<!-- emoji menu -->
	{#if isMobileEmojiMenuOpen}
		<div class="absolute bottom-20 right-[7%] mt-2 w-[90%] rounded-md p-2">
			<ReactionMenu mobile onSelect={handleEmojiSelect} />
		</div>
	{/if}

	{#if isJamDetailsMenuOpen}
		<div class="bg-surface-200 absolute bottom-20 right-[7%] mt-2 w-[90%] rounded-md p-2 shadow-sm">
			<div class="flex items-center justify-between border-b py-1">
				<h1 class="text-lg">Jam details</h1>
				<button
					class=""
					onclick={() => {
						isMobileOptionsMenuOpen = false;
						isJamDetailsMenuOpen = false;
					}}
				>
					<X />
				</button>
			</div>
			<div class="mt-2">
				<h4>Joining Info</h4>

				<span class="text-surface-300 my-2 text-lg">
					{$page.url.href}
				</span>

				<button
					class="mt-4 flex items-center"
					onclick={() => {
						navigator.clipboard.writeText($page.url.href);
					}}
				>
					<Copy />
					<span class="ml-2 text-sm">Copy joining info</span>
				</button>
			</div>
		</div>
	{/if}

	{#if isMobileOptionsMenuOpen}
		<MobileMenu
			closeMenu={() => (isMobileOptionsMenuOpen = false)}
			openJamDetailsMenu={() => (isJamDetailsMenuOpen = true)}
		/>
	{/if}

	<MicrophoneSelectorAndSwitch />
	<CameraSelectorAndSwitch />
	<AudioOutputSelector />

	<!-- emoji -->
	<button
		onclick={() => {
			isMobileEmojiMenuOpen = !isMobileEmojiMenuOpen;
		}}
		class={`text-on-primary-token flex items-center justify-center rounded-full p-2 ${
			isMobileEmojiMenuOpen ? 'bg-primary-500' : 'bg-surface-400'
		}`}
	>
		<Laugh />
	</button>

	<!-- menu -->
	<button
		class="bg-surface-400 text-on-primary-token flex items-center justify-center rounded-full p-2"
		onclick={() => {
			isMobileOptionsMenuOpen = !isMobileOptionsMenuOpen;
		}}
	>
		<CircleEllipsis />
	</button>
	<LeaveCloseButton />
</div>
