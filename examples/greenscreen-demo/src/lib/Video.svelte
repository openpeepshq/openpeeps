<script lang="ts">
	export let stream: MediaStream | undefined;

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
	<video use:srcObject={stream} autoplay playsinline style="height: 150px"></video>
{/if}
