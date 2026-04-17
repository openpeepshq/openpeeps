<script lang="ts">
  import {
    type AudienceSetting,
    type Event,
    type PostCreationData,
    type PublicProfile,
    postCreationDataSchema,
  } from '@openpeeps/common/types';
  import {
    Button,
    Form,
    FormInput,
    getModalManager,
    Label,
    ModalFooter,
    ModalHeader,
    ModalWrapper,
  } from '@openpeeps/ui';
  import { Eye } from 'lucide-svelte';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import {
    createPostMutation,
    currentProfileStore,
    profilesStore,
  } from '$lib/api';
  import { i18nContext } from '$lib/components/i18n';
  import { getNewPostStores } from '$lib/stores';
  import { VisibilitySelector } from '../../post';
  import { ProfileSelector } from '../../profile';
  import { checkRoleCapabilities } from '@openpeeps/common';
  import { AccessDeniedLoader } from '$lib/components/layout';
  import { eventSanitizer } from '$lib/stores';
  import { getCurrentProfile } from '$lib/auth';

  const me = getCurrentProfile();

  const sanitize = eventSanitizer();

  const profilesQuery = profilesStore();

  const profileQuery = currentProfileStore();
  const isAdmin: boolean = $derived(
    checkRoleCapabilities(['admin'], $profileQuery.data?.roles ?? []).success,
  );

  const createPost = createPostMutation();
  const { t } = i18nContext();
  const modalManager = getModalManager();

  const newPostStores = getNewPostStores();

  let { resetNewJamState } = newPostStores;

  let jam = $state(sanitize(newPostStores.jam));

  let event = $derived(jam.data as Event);

  const handleModeratorsChange = (profiles: PublicProfile[]) => {
    if (event.jam) {
      event.jam.moderators = profiles.map((profile) => profile.id);
    }
  };

  const handleCreateJam = async () => {
    (jam.data as Event).start = new Date().toISOString();
    if (jam.visibility === 'direct') {
      jam.audience = [...(jam.audience ?? []), me];
    }
    const eventPost = await createPost(jam);

    resetNewJamState();

    await goto(`/events/${eventPost.id}/jam`);

    modalManager.close();
  };

  const handleSchedule = () => {
    newPostStores.event = $state.snapshot(jam);
    resetNewJamState();
    modalManager.close();
    goto('/events/new');
  };

  const setAudience = (audienceSetting?: AudienceSetting) => {
    const isUserInAudience = audienceSetting?.audience?.some(
      (audienceMember) => audienceMember.id === me.id,
    );
    if (audienceSetting) {
      jam.visibility = audienceSetting.visibility;
      jam.groupId = audienceSetting.groupId;
      jam.audience = isUserInAudience
        ? audienceSetting.audience
        : [...(audienceSetting.audience ?? []), me];
    }
  };

  const onchange = (data: PostCreationData) => {
    newPostStores.jam = data;
  };

  onMount(() => {
    if (event.jam?.moderators.length === 0) {
      event.jam.moderators = [me.id];
    }
  });
</script>

<ModalWrapper>
  <ModalHeader title={t('jams.create.title')} />
  <div class="mb-4 overflow-y-scroll px-4 pt-2">
    <Form bind:data={jam} schema={postCreationDataSchema} {onchange}>
      <FormInput title={t('jams.form.name')} path={['data', 'name']} />
      <FormInput
        title={t('visibility.event.title')}
        description={t('events.form.visibilityNotChangeable')}
        type="mock"
        path={[]}
      >
        {#snippet lead()}
          <Eye size={16} />
        {/snippet}
        <div class="p-0! h-10">
          <VisibilitySelector postData={jam} showDirect {setAudience} />
        </div>
      </FormInput>
      <FormInput
        title={t('events.form.jamWaitingRoom')}
        description={t('events.form.jamWaitingRoomDescription')}
        type="checkbox"
        path={['data', 'jam', 'waitingRoom']}
      />
      <Label title={t('events.form.jamModerators')}>
        <AccessDeniedLoader queries={[$profilesQuery]}>
          <ProfileSelector
            overRide
            onchange={handleModeratorsChange}
            selectedProfiles={$profilesQuery.data?.filter((p) =>
              event.jam?.moderators?.includes(p.id),
            )}
          />
        </AccessDeniedLoader>
      </Label>
    </Form>
  </div>
  <!-- footer -->
  <ModalFooter extraClassNames={'justify-between'}>
    {#if isAdmin}
      <Button
        title={t('jams.createFlow.schedule')}
        action={handleSchedule}
        variant="variant-ringed-primary"
      >
        {t('jams.createFlow.schedule')}
      </Button>
    {/if}
    <Button
      title={t('jams.start.submit')}
      action={handleCreateJam}
      variant="variant-filled-primary"
    >
      {t('jams.start.submit')}
    </Button>
  </ModalFooter>
</ModalWrapper>
