<script lang="ts">
  import {
    type GroupWithMeta,
    type ProfileWithMeta,
    type VisibilityType,
  } from '@openpeeps/common';
  import { i18nContext } from '$lib/components/i18n';
  import { goto } from '$app/navigation';
  import { CalendarPlus } from 'lucide-svelte';
  import NewPostButton from './NewPostButton.svelte';

  const { t } = i18nContext();

  type Props = {
    visibility: VisibilityType;
    currentProfile?: ProfileWithMeta;
    group?: GroupWithMeta;
  };

  let { visibility, currentProfile, group }: Props = $props();
</script>

<NewPostButton
  type="event"
  Icon={CalendarPlus}
  {visibility}
  {currentProfile}
  {group}
  title={t('events.form.title')}
  action={() => goto('/events/new')}
/>
