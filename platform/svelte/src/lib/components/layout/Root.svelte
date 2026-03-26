<script lang="ts">
  import {
    FooterMobile,
    SideBar,
    Breadcrumbs,
    HeaderMobile,
    ContentHeader,
    PlusButton,
  } from '$lib/components/navigation';
  import Infos from './Infos.svelte';

  interface Props {
    children?: import('svelte').Snippet;
  }

  let { children }: Props = $props();
</script>

<div class="flex h-full w-full flex-col">
  <div class="flex-grow">
    <div class="flex min-h-full w-full flex-col overflow-y-auto">
      <div class="mx-auto h-1 w-full flex-grow md:max-w-[950px]">
        <div class="bg-surface-50 w-70 fixed hidden h-screen border-r md:flex">
          <SideBar />
        </div>
        <div
          class="bg-surface-50 md:ml-70 flex h-fit min-h-screen flex-col border-r"
        >
          <HeaderMobile />
          <ContentHeader />
          <Breadcrumbs />
          <Infos />
          {@render children?.()}
          <PlusButton />
        </div>
      </div>
    </div>
  </div>
  <div class="bottom-0 w-full flex-grow-0 md:hidden">
    <FooterMobile />
  </div>
</div>
