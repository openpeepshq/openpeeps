<script lang="ts">
	interface Props {
		stream: MediaStream | undefined;
		videoClass?: string;
		videoStyle?: string;
	}

	let {
		stream,
		videoClass = 'object-cover object-center w-full h-full block overflow-hidden rounded-xl',
		videoStyle = ''
	}: Props = $props();

	const srcObject = (node: HTMLVideoElement, stream: MediaStream) => {
		node.srcObject = stream;
		return {
			update(newStream: MediaStream) {
				if (node.srcObject != newStream) {
					node.srcObject = newStream;
				}
			}
		};
	};
</script>

{#if stream}
      <video
        use:srcObject={stream}
        class={videoClass}
        autoplay
        playsinline
      ></video>
{/if}
