<script lang="ts">
  import { FormInput, getFormContext, Label } from '@openpeeps/ui';
  import { i18nContext } from '$lib/components/i18n';
  import { getServerInfo } from '@openpeeps/svelte/server';
  import LocationInput from '$lib/components/form/LocationInput.svelte';
  import { Link } from 'lucide-svelte';
  import AccessDeniedLoader from '$lib/components/layout/AccessDeniedLoader.svelte';
  import ProfileSelector from '../../profile/ProfileSelector.svelte';
  import type {
    Event,
    PostCreationData,
    PublicProfile,
  } from '@openpeeps/common/types';
  import { profilesStore } from '$lib/api';
  import { getCurrentProfile } from '$lib/auth';
  import { page } from '$app/state';
  import { onMount } from 'svelte';

  interface Props {
    isEdit?: boolean;
  }

  let { isEdit = false }: Props = $props();

  const me = getCurrentProfile();
  const profilesQuery = profilesStore();
  const serverInfo = getServerInfo();

  const { data, validate } = getFormContext<PostCreationData>();

  const initialEvent = $state.snapshot(data?.data as Event);
  let initialModeratorIds = $state(initialEvent.jam?.moderators);

  let initialProfiles = $derived(
    initialModeratorIds
      ?.map((id) => $profilesQuery.data?.find((profile) => profile.id === id))
      .filter(Boolean) as PublicProfile[],
  );
  let selectedProfiles = $derived(
    initialProfiles.length > 0 ? initialProfiles : isEdit ? [] : [me],
  );

  let event = $derived(data?.data as Event);

  let eventFormat = $state(
    initialEvent.jam
      ? 'jam'
      : initialEvent.physicalLocation
        ? 'in-person'
        : 'external',
  );

  const maybeSwitchEventFormat = (value: string) => () => {
    if (eventFormat === value) {
      return;
    }
    eventFormat = value;
    if (eventFormat === 'jam') {
      event.jam = {
        type: 'video-call',
        moderators: [me.id],
        videoEnabled: true,
        speakers: [],
        presenters: [],
      };
      initialModeratorIds = [me.id];
      event.physicalLocation = undefined;
      event.url = page.url.origin;
    } else if (eventFormat === 'external') {
      event.jam = undefined;
      event.physicalLocation = undefined;
      event.url = '';
    } else if (eventFormat === 'in-person') {
      event.jam = undefined;
      event.physicalLocation = { text: '' };
      event.url = undefined;
    }
    validate();
  };

  const handleModeratorsChange = (profiles: PublicProfile[]) => {
    if (event.jam) {
      event.jam.moderators = profiles.map((profile) => profile.id);
      validate();
    }
  };

  const { t } = i18nContext();
  const eventFormats = [
    ...(serverInfo.jams.livekit.enabled
      ? [{ value: 'jam', label: t('events.form.jamFormatLabel') }]
      : []),
    { value: 'external', label: t('events.form.externalFormatLabel') },
    { value: 'in-person', label: t('events.form.inPersonFormatLabel') },
  ];

  onMount(() => {
    if (
      serverInfo.jams.livekit.enabled &&
      !isEdit &&
      eventFormat === 'jam' &&
      event.jam?.moderators.length === 0
    ) {
      event.jam.moderators = [me.id];
    }
  });
</script>

<Label title={t('events.form.eventFormat')}>
  <div class="flex flex-col gap-2">
    {#snippet eventFormatItem(format: { value: string; label: string })}
      <label class="flex items-center gap-2 w-fit">
        <input
          class="radio"
          type="radio"
          name="eventFormat"
          value={format.value}
          checked={eventFormat === format.value}
          oninput={maybeSwitchEventFormat(format.value)}
        />
        <span>{format.label}</span>
      </label>
    {/snippet}
    {#each eventFormats as format}
      {@render eventFormatItem(format)}
    {/each}
  </div>
</Label>

{#if eventFormat === 'in-person'}
  <LocationInput
    title={t('events.form.location')}
    path={['data', 'physicalLocation']}
  />
{:else if eventFormat === 'external'}
  <FormInput
    title={t('events.form.externalFormatLabel')}
    type="text"
    path={['data', 'url']}
    placeholder={t('events.form.externalEventUrlPlaceholder')}
  >
    {#snippet lead()}
      <Link class="size-4" />
    {/snippet}
  </FormInput>
{:else if eventFormat === 'jam' && serverInfo.jams.livekit.enabled}
  <Label title={t('events.form.jamModerators')}>
    <AccessDeniedLoader queries={[$profilesQuery]}>
      <ProfileSelector onchange={handleModeratorsChange} {selectedProfiles} />
    </AccessDeniedLoader>
  </Label>
  <FormInput
    title={t('events.form.jamWaitingRoom')}
    description={t('events.form.jamWaitingRoomDescription')}
    type="checkbox"
    path={['data', 'jam', 'waitingRoom']}
  />
{/if}
