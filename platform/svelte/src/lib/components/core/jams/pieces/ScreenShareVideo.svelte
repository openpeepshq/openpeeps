<script lang="ts">
	import { Participant } from 'livekit-client';
	import { participantScreenShareTrackStore } from '../stores';
	import Video from './Video.svelte';
	import { getLivekitRoom } from '../context';
	import { ScreenShare, Maximize2 } from 'lucide-svelte';
	import { Button } from '@openpeeps/ui';
	import { AvatarWithName } from '$lib/components';
	import { toggleScreenShare } from '../actions';
	import { profileName } from '@openpeeps/common/lib';

	interface Props {
		participant: Participant;
	}

	let { participant }: Props = $props();
	const room = getLivekitRoom();

	const screenShareTrack = participantScreenShareTrackStore(participant);

	let participantDetails = $derived(JSON.parse(participant.metadata || '{}'));
	let screenContainer: HTMLElement;

	let isUsingCssFallback = false;
	let originalStyles = {
		position: '',
		top: '',
		left: '',
		width: '',
		height: '',
		zIndex: ''
	};

	const toggleFullscreen = (element: HTMLElement) => {
		const applyStyles = (prev: typeof originalStyles, next: typeof originalStyles) => {
			prev.position = element.style.position;
			prev.top = next.top;
			prev.left = next.left;
			prev.width = next.width;
			prev.height = next.height;
			prev.zIndex = next.zIndex;
		};
		if (!document.fullscreenElement && !isUsingCssFallback) {
			applyStyles(originalStyles, element.style);

			element.requestFullscreen().catch((_) => {
				const htmlEl = element as HTMLElement & {
					webkitRequestFullscreen?: () => Promise<void>;
					mozRequestFullScreen?: () => Promise<void>;
					msRequestFullscreen?: () => Promise<void>;
				};

				if (htmlEl.webkitRequestFullscreen) {
					htmlEl.webkitRequestFullscreen();
				} else if (htmlEl.mozRequestFullScreen) {
					htmlEl.mozRequestFullScreen();
				} else if (htmlEl.msRequestFullscreen) {
					htmlEl.msRequestFullscreen();
				} else {
					applyStyles(element.style, {
						position: 'fixed',
						top: '0',
						left: '0',
						width: '100vw',
						height: '100vh',
						zIndex: '9999'
					});
					isUsingCssFallback = true;
				}
			});
		} else {
			if (isUsingCssFallback) {
				applyStyles(element.style, originalStyles);
				isUsingCssFallback = false;
			} else {
				const doc = document as Document & {
					webkitExitFullscreen?: () => Promise<void>;
					mozCancelFullScreen?: () => Promise<void>;
					msExitFullscreen?: () => Promise<void>;
				};
				if (doc.exitFullscreen) {
					doc.exitFullscreen();
				} else if (doc.webkitExitFullscreen) {
					doc.webkitExitFullscreen();
				} else if (doc.mozCancelFullScreen) {
					doc.mozCancelFullScreen();
				} else if (doc.msExitFullscreen) {
					doc.msExitFullscreen();
				}
			}
		}
	};
</script>

<div class="flex w-full flex-col gap-2 md:size-full">
	<div class="flex-0 mx-auto flex w-full items-center justify-between rounded-full">
		{#if room.localParticipant.identity === participant.identity}
			<div class="flex gap-x-2">
				<ScreenShare />
				{profileName(participantDetails.profile)}
				(You presenting)
			</div>
			<Button
				title="Stop Screen sharing"
				action={() => {
					toggleScreenShare(room);
				}}
				variant="variant-ringed-secondary"
			>
				stop sharing
			</Button>
		{:else}
			<div class="flex gap-x-2 py-2">
				<AvatarWithName profile={participantDetails.profile} />
				(presenting)
			</div>
		{/if}
	</div>
	<div
		class="relative w-full flex-1 overflow-hidden rounded-xl border md:p-0"
		bind:this={screenContainer}
	>
		{#if $screenShareTrack && $screenShareTrack.mediaStream && !$screenShareTrack.isMuted}
			<Video
				videoClass="w-full h-full object-contain object-center"
				stream={$screenShareTrack.mediaStream}
			/>
			<button
				class="absolute bottom-3 right-3 rounded-full bg-surface-900/60 p-2 transition-colors text-on-primary-token hover:bg-surface-900/80"
				onclick={() => toggleFullscreen(screenContainer)}
			>
				<Maximize2 size={20} />
			</button>
		{/if}
	</div>
</div>
