<script lang="ts">
	import Video from '$lib/Video.svelte';
	import {
		blurProcessor,
		imageProcessor,
		transformStream,
		videoProcessor
	} from '@openpeeps/greenscreen';

	let originalStream: MediaStream | undefined;
	let blurredBackgroundStream: MediaStream | undefined;
	let imageBackgroundStream: MediaStream | undefined;
	let videoBackgroundStream: MediaStream | undefined;

	let started = false;

	const start = async () => {
		originalStream = await navigator.mediaDevices.getUserMedia({
			video: {
				width: 150,
				height: 150
			}
		});
		if (originalStream) {
			blurredBackgroundStream = await transformStream(originalStream, blurProcessor(12));
			imageBackgroundStream = await transformStream(
				originalStream,
				await imageProcessor('/Tiger_at_Chicago_Brookfield_Zoo.jpg')
			);
			videoBackgroundStream = await transformStream(
				originalStream,
				await videoProcessor(
					'/2124_sunset_Tree_Africa_LonelytreeatsunsetCCBYNatureClip720p5000br.mp4'
				)
			);
			started = true;
		}
	};

	const stop = () => {
		originalStream?.getTracks().forEach(function (track) {
			track.stop();
		});
		started = false;
	};
</script>

<h1>Welcome to the demo for GreenScreen by AllPeeP</h1>
<p>
	This is the demo site for the greenscreen library that allows you to easily create a videostream
	that blurs or obfuscates the background of a speaker.
</p>

<p>
	<button on:click={start} disabled={started}>Start</button>
	<button on:click={stop} disabled={!started}>Stop</button>
</p>

{#if started}
	<div class="video-grid">
		<div class="video-box">
			<h2>Original</h2>
			<p><Video stream={originalStream} /></p>
		</div>
		<div class="video-box">
			<h2>Blurred</h2>
			<p><Video stream={blurredBackgroundStream} /></p>
		</div>
		<div class="video-box">
			<h2>Image</h2>
			<p><Video stream={imageBackgroundStream} /></p>
		</div>
		<div class="video-box">
			<h2>Video</h2>
			<p><Video stream={videoBackgroundStream} /></p>
			<p class="cc-by">Lonely Tree at sunset CC-BY NatureClip</p>
		</div>
	</div>
{/if}

<style>
	.video-grid {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
	}
	.video-box {
		width: 150px;
		padding: 1em;
	}
	.video-box h2 {
		font-size: 1em;
	}
	.cc-by {
		font-size: 0.5em;
	}
</style>
