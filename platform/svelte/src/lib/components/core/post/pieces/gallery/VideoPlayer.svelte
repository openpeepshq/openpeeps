<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { CircleAlert, LoaderCircle } from 'lucide-svelte';
	import type { MediaAttachmentData, MediaStream } from '@openpeeps/common/types';
	import { i18nContext } from '$lib/components/i18n';
	import { createVodStream, getVodStreamStatus, vodMasterPlaylistUrl } from '$lib/api/streaming';

	interface Props {
		attachment: MediaAttachmentData;
		autoplay?: boolean;
		muted?: boolean;
		class?: string;
	}

	let {
		attachment,
		autoplay = true,
		// Browsers block unmuted autoplay; start muted so playback can begin
		// immediately and the user can unmute via the player controls.
		muted = true,
		class: className = 'size-full max-h-full min-h-0',
	}: Props = $props();

	const { t } = i18nContext();

	const POLL_INTERVAL_MS = 5_000;

	type Mode = 'pending' | 'local' | 'federated';
	type LocalState = 'loading' | 'processing' | 'ready' | 'error';

	let registered = $state(false);
	let mode: Mode = $state('pending');
	let localState: LocalState = $state('loading');
	let hlsUrl: string | null = $state(null);

	let mediaEl: HTMLElement | undefined = $state();
	const asMedia = (el: HTMLElement | undefined): HTMLMediaElement | undefined =>
		el as unknown as HTMLMediaElement | undefined;

	let pollTimer: ReturnType<typeof setTimeout> | undefined;
	let disposed = false;

	/**
	 * hls-video uses display:contents in its shadow host, so intrinsic video
	 * height escapes the gallery shell. Force a real box + contain on the inner
	 * <video> (see @videojs/html video-host template).
	 */
	const patchHlsVideo = (el: HTMLElement | undefined) => {
		const root = el?.shadowRoot;
		if (!root || root.getElementById('vjs-gallery-hls-patch')) return;

		const style = document.createElement('style');
		style.id = 'vjs-gallery-hls-patch';
		style.textContent = `
			:host {
				display: block;
				width: 100%;
				height: 100%;
				max-height: 100%;
				min-height: 0;
			}
			video {
				display: block;
				width: 100%;
				height: 100%;
				max-height: 100%;
				object-fit: var(--media-object-fit, contain);
				object-position: var(--media-object-position, center);
				background: #000;
			}
		`;
		root.appendChild(style);
	};

	$effect(() => {
		if (localState !== 'ready' || !hlsUrl || !mediaEl) return;
		patchHlsVideo(mediaEl);
		if (!mediaEl.shadowRoot) {
			requestAnimationFrame(() => patchHlsVideo(mediaEl));
		}
	});

	const buildHlsUrl = (stream: MediaStream) => {
		const origin = new URL(attachment.url).origin;
		return vodMasterPlaylistUrl(stream.storageId, origin);
	};

	const applyStream = (stream: MediaStream) => {
		if (stream.status === 'ready') {
			hlsUrl = buildHlsUrl(stream);
			localState = 'ready';
			return true;
		}
		if (stream.status === 'error') {
			localState = 'error';
			return true;
		}
		localState = 'processing';
		return false;
	};

	const startPolling = (storageId: string) => {
		const tick = async () => {
			if (disposed) return;
			try {
				const status = await getVodStreamStatus(storageId);
				if (disposed) return;
				if (applyStream(status)) {
					pollTimer = undefined;
					return;
				}
			} catch {
				// Transient blip — keep polling.
			}
			pollTimer = setTimeout(tick, POLL_INTERVAL_MS);
		};
		pollTimer = setTimeout(tick, POLL_INTERVAL_MS);
	};

	const startLocalFlow = async () => {
		try {
			const stream = await createVodStream(attachment.url);
			if (disposed) return;
			if (!applyStream(stream)) {
				startPolling(stream.storageId);
			}
		} catch (e) {
			console.debug('VOD streaming failed for local content', e);
			if (!disposed) localState = 'error';
		}
	};

	onMount(() => {
		void Promise.all([
			import('@videojs/html/video/player'),
			import('@videojs/html/media/hls-video'),
			import('./video-player-gallery.css'),
		])
			.then(() => {
				if (disposed) return;
				registered = true;

				const sameOrigin =
					typeof window !== 'undefined' &&
					new URL(attachment.url).origin === window.location.origin;
				mode = sameOrigin ? 'local' : 'federated';

				if (mode === 'local') {
					void startLocalFlow();
				}
			})
			.catch((e) => {
				console.error('Failed to load video.js v10 modules', e);
			});
	});

	onDestroy(() => {
		disposed = true;
		if (pollTimer) {
			clearTimeout(pollTimer);
			pollTimer = undefined;
		}
	});

	const tryAutoplay = (el: HTMLMediaElement) => {
		if (!autoplay || el.paused === false) return;
		void el.play().catch(() => {
			el.muted = true;
			void el.play().catch(() => undefined);
		});
	};

	$effect(() => {
		if (!autoplay || !registered) return;
		const el = asMedia(mediaEl);
		if (!el) return;

		const canPlay =
			mode === 'federated' ||
			(mode === 'local' && localState === 'ready' && hlsUrl);
		if (!canPlay) return;

		tryAutoplay(el);
	});
</script>

<!--
  Gallery uses native controls on the media element directly — not video-skin.
  The packaged skin's media-container sizes to intrinsic video height, which
  breaks portrait HLS inside the fixed h-3/4 gallery wrapper.
-->
<div class="vjs-shell {className}">
	{#if !registered || mode === 'pending'}
		<div class="vjs-status" aria-hidden="true"></div>
	{:else if mode === 'federated'}
		<!-- svelte-ignore a11y_media_has_caption -->
		<video
			class="gallery-media"
			bind:this={mediaEl}
			src={attachment.url}
			controls
			autoplay={autoplay || undefined}
			muted={muted || undefined}
			playsinline
		></video>
	{:else if localState === 'ready' && hlsUrl}
		<video-player>
			<hls-video
				class="gallery-media"
				bind:this={mediaEl}
				src={hlsUrl}
				controls
				autoplay={autoplay ? '' : undefined}
				muted={muted ? '' : undefined}
				playsinline
			></hls-video>
		</video-player>
	{:else if localState === 'error'}
		<div class="vjs-status vjs-status--error" role="alert">
			<CircleAlert class="h-10 w-10" />
			<span>{t('posts.gallery.videoError')}</span>
		</div>
	{:else}
		<div class="vjs-status" aria-live="polite">
			<LoaderCircle class="h-10 w-10 animate-spin" />
			<span>{t('posts.gallery.videoProcessing')}</span>
		</div>
	{/if}
</div>

<style>
	.vjs-shell {
		position: relative;
		display: block;
		width: 100%;
		height: 100%;
		max-height: 100%;
		min-height: 0;
		overflow: hidden;
		border-radius: 0.5rem;
	}
	.vjs-status {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		width: 100%;
		height: 100%;
		padding: 1.5rem;
		background: rgba(0, 0, 0, 0.5);
		color: white;
		text-align: center;
	}
	.vjs-status--error {
		color: #fca5a5; /* red-300 */
	}
</style>
