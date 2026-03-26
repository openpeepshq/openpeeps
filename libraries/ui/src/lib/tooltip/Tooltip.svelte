<script lang="ts">
  import { onMount } from 'svelte';

  interface Props {
    position?: 'top' | 'bottom' | 'left' | 'right';
    children?: import('svelte').Snippet;
  }

  let { position = 'top', children }: Props = $props();

  let tooltip: HTMLDivElement | undefined = $state();

  onMount(() => {
    const handleMouseEnter = () => {
      tooltip && (tooltip.style.visibility = 'visible');
    };

    const handleMouseLeave = () => {
      tooltip && (tooltip.style.visibility = 'hidden');
    };

    tooltip?.parentElement?.addEventListener('mouseenter', handleMouseEnter);
    tooltip?.parentElement?.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      tooltip?.parentElement?.removeEventListener(
        'mouseenter',
        handleMouseEnter,
      );
      tooltip?.parentElement?.removeEventListener(
        'mouseleave',
        handleMouseLeave,
      );
    };
  });
</script>

<div
  bind:this={tooltip}
  class="tooltip {position}"
  onmouseenter={() => tooltip && (tooltip.style.visibility = 'visible')}
  onmouseleave={() => tooltip && (tooltip.style.visibility = 'hidden')}
>
  {@render children?.()}
</div>

<style>
  .tooltip {
    position: absolute;
    background-color: black;
    color: white;
    padding: 0.5em;
    border-radius: 0.25em;
    font-size: 0.8em;
    white-space: nowrap;
    visibility: hidden;
    z-index: 1000;
  }

  .top {
    transform: translate(-50%, -100%);
    bottom: 100%;
    left: 50%;
    margin-bottom: 0.5em;
  }

  .bottom {
    transform: translate(-50%, 0);
    top: 100%;
    left: 50%;
    margin-top: 0.5em;
  }

  .left {
    transform: translate(-100%, -50%);
    right: 100%;
    top: 50%;
    margin-right: 0.5em;
  }

  .right {
    transform: translate(0, -50%);
    left: 100%;
    top: 50%;
    margin-left: 0.5em;
  }
</style>
