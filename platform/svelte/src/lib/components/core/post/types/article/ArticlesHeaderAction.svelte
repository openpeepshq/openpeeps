<script lang="ts">
  import {
    checkGroupCapabilities,
    checkRoleCapabilities,
  } from '@openpeeps/common';
  import { Button } from '@openpeeps/ui';
  import { me } from '$lib/api';
  import { i18nContext } from '@openpeeps/svelte/components';
  const { t } = i18nContext();

  function checkCanCreateArticle() {
    const hasRoleCapability = checkRoleCapabilities(
      ['core-posts-create-article-local'],
      $me?.roles,
    ).success;

    if (hasRoleCapability) return true;

    const hasGroupCapability =
      $me?.memberships?.some(
        (membership) =>
          checkGroupCapabilities(
            ['core-posts-create-article-*'],
            $me,
            membership.group,
          ).success,
      ) || false;

    return hasGroupCapability;
  }

  let canCreateArticle = $derived(checkCanCreateArticle());
</script>

{#if canCreateArticle}
  <Button
    title={t('articles.form.title')}
    action="/articles/new"
    variant="variant-filled-primary"
  >
    {t('articles.form.title')}
  </Button>
{/if}
