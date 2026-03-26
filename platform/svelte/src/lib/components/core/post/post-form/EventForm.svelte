<script lang="ts">
  import { Eye } from 'lucide-svelte';
  import {
    postCreationDataSchema,
    type Event,
    type PostCreationData,
    type AudienceSetting,
  } from '@openpeeps/common/types';
  import { Form, FormInput, Input, Label } from '@openpeeps/ui';
  import { FormImageInput } from '../../form';
  import VisibilitySelector from './VisibilitySelector.svelte';
  import { addHours } from 'date-fns';
  import { FormOpenpeepsMarkdownInput } from '../../form';
  import { i18nContext } from '$lib/components/i18n';
  import EventTypeSwitcher from './EventTypeSwitcher.svelte';
  import { getCurrentProfile } from '$lib/auth';

  const me = getCurrentProfile();

  interface Props {
    postData: PostCreationData;
    isEdit?: boolean;
    onchange?: (data: PostCreationData) => void;
    valid?: boolean;
  }

  let {
    postData = $bindable(),
    isEdit = false,
    onchange,
    valid = $bindable(),
  }: Props = $props();

  let event = $derived(postData.data as Event);
  const { t } = i18nContext();

  const initialEvent = postData.data as Event;

  let showEndDate = $state(initialEvent.end !== undefined);

  let timeZone = $derived(event.timeZone);

  const toggleEndDate = (
    e: globalThis.Event & {
      currentTarget: EventTarget & HTMLInputElement;
    },
  ) => {
    const newShowEndDate = e.currentTarget.checked;
    if (!showEndDate && newShowEndDate) {
      event.end = addHours(event.start, 1).toISOString();
    } else if (!newShowEndDate) {
      event.end = undefined;
    }
    showEndDate = newShowEndDate;
  };

  const setAudience = (audienceSetting?: AudienceSetting) => {
    const isUserInAudience = audienceSetting?.audience?.some(
      (audienceMember) => audienceMember.id === me.id,
    );
    if (audienceSetting) {
      postData.visibility = audienceSetting.visibility;
      postData.groupId = audienceSetting.groupId;
      postData.audience = isUserInAudience
        ? audienceSetting.audience
        : [...(audienceSetting.audience ?? []), me];
    }
  };
</script>

<Form
  bind:data={postData}
  schema={postCreationDataSchema}
  {onchange}
  bind:valid
>
  <FormImageInput
    usage="event-header-image"
    displayType="full"
    maxWidth={480}
    showSelectAspectRatio={true}
    aspectRatio="16:9"
    text="Upload your cover image"
    specsText="Minimum width 480 pixels, 16:9 recommended"
    showAltInput={false}
    classes={'h-[250px]'}
    path={['data', 'image']}
  />

  <div class="mt-4 flex flex-col gap-4 px-3">
    <h2 class="text-lg">{t('events.form.title')}</h2>
    <FormInput
      title={t('events.form.name')}
      type="text"
      path={['data', 'name']}
    />

    <p class="text-surface-500 text-sm">{t('events.form.description')}</p>

    <FormOpenpeepsMarkdownInput
      placeholder={t('events.form.descriptionPlaceholder')}
      maxLength={5000}
      path={['data', 'content']}
      inline
    />

    <h2 class="text-lg">{t('events.form.dateAndTimeTitle')}</h2>

    <FormInput
      title={t('events.form.startDate')}
      type="datetime-local"
      path={['data', 'start']}
      {timeZone}
      step={60}
    />

    <Label description={t('events.form.addEndDate')} forCheckbox={true}>
      <Input type="checkbox" checked={showEndDate} oninput={toggleEndDate} />
    </Label>

    {#if showEndDate}
      <FormInput
        title={t('events.form.endDate')}
        type="datetime-local"
        path={['data', 'end']}
        {timeZone}
        step={60}
      />
    {/if}

    <FormInput
      title={t('events.form.timezone')}
      placeholder={t('events.form.timezonePlaceholder')}
      type="select"
      path={['data', 'timeZone']}
      options={Intl.supportedValuesOf('timeZone').map((value) => ({
        value,
        label: value,
      }))}
    />

    <h2 class="text-lg">{t('events.form.location')}</h2>

    <EventTypeSwitcher {isEdit} />

    <h2 class="text-lg">{t('events.form.people')}</h2>

    <FormInput
      title={t('events.form.visibility')}
      description={t('events.form.visibilityNotChangeable')}
      type="mock"
      path={[]}
    >
      {#snippet lead()}
        <Eye size={16} />
      {/snippet}
      <div class="p-0! h-10">
        <VisibilitySelector
          {postData}
          disabled={isEdit}
          {isEdit}
          {setAudience}
          showDirect
        />
      </div>
    </FormInput>

    <!-- <FormInput title="Number of attendees" type="number" path={['data', 'maxAttendees']} /> -->
    <FormInput
      description={t('events.form.attendeeListPublic')}
      type="checkbox"
      path={['data', 'attendeeListPublic']}
    />
  </div>
</Form>
