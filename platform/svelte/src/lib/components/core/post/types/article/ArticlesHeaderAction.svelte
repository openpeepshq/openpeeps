<script lang="ts">
  import {
    checkGroupCapabilities,
    checkRoleCapabilities,
  } from '@openpeeps/common/lib';
  import { Button } from '@openpeeps/ui';
  import { me } from '$lib/api';
  import { getCurrentAuthData } from '$lib/auth';
  import { i18nContext } from '@openpeeps/svelte/components';
  const { t } = i18nContext();
  const authData = getCurrentAuthData();

  function checkCanCreateArticle() {
    const hasRoleCapability = checkRoleCapabilities(
      $me?.roles ?? [],
      ['core-posts-create-article-local'],
    ).success;

    if (hasRoleCapability) return true;

    const hasGroupCapability =
      $me?.memberships?.some(
        (membership) =>
          checkGroupCapabilities(
            authData,
            ['core-posts-create-article-*'],
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
