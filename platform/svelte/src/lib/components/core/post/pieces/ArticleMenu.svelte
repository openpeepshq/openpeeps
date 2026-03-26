<script lang="ts">
  import type { PublicPost } from '@openpeeps/common/types';
  import { Pencil } from 'lucide-svelte';
  import { PopupMenu, PopupMenuButton, type Variant } from '@openpeeps/ui';
  import type { Snippet } from 'svelte';
  import { i18nContext } from '$lib/components/i18n';
  import { getCurrentProfile } from '$lib/auth';

  const me = getCurrentProfile();
  const { t } = i18nContext();
  interface Props {
    post: PublicPost;
    menuButton?: Snippet;
    variant?: Variant;
    class?: string;
  }

  let { post, menuButton, variant, class: additionalClasses }: Props = $props();
</script>

<PopupMenu
  menuId="article-menu-{post.id}"
  {menuButton}
  {variant}
  class={additionalClasses}
>
  {#if me?.id === post.profile.id}
    <PopupMenuButton
      title={t('common.actions.edit')}
      action="/articles/{post.id}/edit"
      text={t('common.actions.edit')}
      icon={Pencil}
    />
  {/if}
</PopupMenu>
